import { openDB } from 'idb';

const DB_NAME = 'tiefbau-offline';
const DB_VERSION = 1;

// Initialize IndexedDB
export async function initOfflineDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      
      // Excavations store
      if (!db.objectStoreNames.contains('excavations')) {
        db.createObjectStore('excavations', { keyPath: 'id' });
      }
      
      // Pending changes queue
      if (!db.objectStoreNames.contains('pendingChanges')) {
        const store = db.createObjectStore('pendingChanges', { keyPath: 'queueId', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('synced', 'synced');
      }
      
      // Photos cache
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      
      // Timesheet entries
      if (!db.objectStoreNames.contains('timesheets')) {
        db.createObjectStore('timesheets', { keyPath: 'id' });
      }
    }
  });
}

// Save project data offline
export async function saveProjectOffline(project) {
  const db = await initOfflineDB();
  await db.put('projects', project);
}

// Get project from offline storage
export async function getProjectOffline(projectId) {
  const db = await initOfflineDB();
  return await db.get('projects', projectId);
}

// Get all projects offline
export async function getAllProjectsOffline() {
  const db = await initOfflineDB();
  return await db.getAll('projects');
}

// Save excavation data offline
export async function saveExcavationOffline(excavation) {
  const db = await initOfflineDB();
  await db.put('excavations', excavation);
}

// Get excavations for a project
export async function getExcavationsOffline(projectId) {
  const db = await initOfflineDB();
  const allExcavations = await db.getAll('excavations');
  return allExcavations.filter(exc => exc.project_id === projectId);
}

// Save photo offline (as base64)
export async function savePhotoOffline(photoId, photoBlob) {
  const db = await initOfflineDB();
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      await db.put('photos', {
        id: photoId,
        data: reader.result,
        timestamp: Date.now()
      });
      resolve(photoId);
    };
    reader.onerror = reject;
    reader.readAsDataURL(photoBlob);
  });
}

// Get photo from offline storage
export async function getPhotoOffline(photoId) {
  const db = await initOfflineDB();
  const photo = await db.get('photos', photoId);
  return photo?.data;
}

// Add to sync queue
export async function addToSyncQueue(action) {
  const db = await initOfflineDB();
  await db.add('pendingChanges', {
    ...action,
    timestamp: Date.now(),
    synced: false
  });
}

// Get pending changes
export async function getPendingChanges() {
  const db = await initOfflineDB();
  const tx = db.transaction('pendingChanges', 'readonly');
  const index = tx.store.index('synced');
  return await index.getAll(false);
}

// Mark change as synced
export async function markAsSynced(queueId) {
  const db = await initOfflineDB();
  const item = await db.get('pendingChanges', queueId);
  if (item) {
    item.synced = true;
    await db.put('pendingChanges', item);
  }
}

// Delete synced items older than 7 days
export async function cleanupSyncedItems() {
  const db = await initOfflineDB();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tx = db.transaction('pendingChanges', 'readwrite');
  const store = tx.store;
  const index = store.index('synced');
  
  let cursor = await index.openCursor(true);
  while (cursor) {
    if (cursor.value.timestamp < weekAgo) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Sync all pending changes
export async function syncPendingChanges(base44) {
  const changes = await getPendingChanges();
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const change of changes) {
    try {
      switch (change.type) {
        case 'project_update':
          await base44.entities.Project.update(change.data.id, change.data);
          break;
          
        case 'excavation_create':
          await base44.entities.Excavation.create(change.data);
          break;
          
        case 'excavation_update':
          await base44.entities.Excavation.update(change.data.id, change.data);
          break;
          
        case 'timesheet_create':
          await base44.entities.TimesheetEntry.create(change.data);
          break;
          
        case 'comment_create':
          await base44.entities.ProjectComment.create(change.data);
          break;
          
        case 'photo_upload':
          // Photos need special handling - convert base64 back to file
          const photoData = await getPhotoOffline(change.photoId);
          if (photoData) {
            const blob = await fetch(photoData).then(r => r.blob());
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            
            // Update the excavation with the uploaded photo URL
            if (change.updateType === 'excavation_photos') {
              const excavation = await base44.entities.Excavation.get(change.excavationId);
              const photoField = change.photoField || 'photos_before';
              const updatedPhotos = [...(excavation[photoField] || []), uploadResult.file_url];
              await base44.entities.Excavation.update(change.excavationId, {
                [photoField]: updatedPhotos
              });
            }
          }
          break;
      }
      
      await markAsSynced(change.queueId);
      results.success++;
    } catch (error) {
      console.error(`Fehler beim Sync von ${change.type}:`, error);
      results.failed++;
      results.errors.push({ change, error: error.message });
    }
  }
  
  // Cleanup old synced items
  await cleanupSyncedItems();
  
  return results;
}

// Preload project data for offline use
export async function preloadProjectData(base44, projectId) {
  try {
    const project = await base44.entities.Project.get(projectId);
    await saveProjectOffline(project);
    
    const excavations = await base44.entities.Excavation.filter({ project_id: projectId });
    for (const exc of excavations) {
      await saveExcavationOffline(exc);
    }
    
    return { success: true, project, excavations };
  } catch (error) {
    console.error('Fehler beim Vorladen:', error);
    return { success: false, error };
  }
}