import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verwende Service Role für automatische Checks
    const projects = await base44.asServiceRole.entities.Project.list();
    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Benachrichtigungen sammeln
    for (const project of projects) {
      // Skip stornierte oder abgeschlossene Projekte
      if (project.project_status === 'Storniert' || 
          project.project_status === 'Auftrag komplett abgeschlossen') {
        continue;
      }

      // VAO-Ablauf prüfen
      if (project.vao_valid_to) {
        const vaoEnd = new Date(project.vao_valid_to);
        vaoEnd.setHours(23, 59, 59, 999);
        const diffDays = Math.ceil((vaoEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Warnung bei 7, 3, 1 Tagen oder überfällig
        if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
          notifications.push({
            title: `VAO läuft bald ab - ${project.project_number}`,
            message: `VAO für Projekt ${project.project_number} läuft in ${diffDays} Tag(en) ab!`,
            type: 'warning',
            projectId: project.id,
            relatedEntity: 'vao_deadline',
            daysRemaining: diffDays
          });
        } else if (diffDays < 0) {
          notifications.push({
            title: `VAO überfällig - ${project.project_number}`,
            message: `VAO für Projekt ${project.project_number} ist seit ${Math.abs(diffDays)} Tag(en) überfällig!`,
            type: 'critical',
            projectId: project.id,
            relatedEntity: 'vao_overdue',
            daysRemaining: diffDays
          });
        }
      }

      // Projekt End-Datum prüfen
      if (project.end_date) {
        const projectEnd = new Date(project.end_date);
        projectEnd.setHours(23, 59, 59, 999);
        const diffDays = Math.ceil((projectEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
          notifications.push({
            title: `Projekt-Deadline nähert sich - ${project.project_number}`,
            message: `Projekt ${project.project_number} muss in ${diffDays} Tag(en) abgeschlossen sein!`,
            type: 'info',
            projectId: project.id,
            relatedEntity: 'project_deadline',
            daysRemaining: diffDays
          });
        }
      }

      // Kritische Meilensteine
      // Grube auf, aber noch nicht verfüllt (länger als 30 Tage)
      if (project.grube_auf_datum && project.project_status !== 'Kann zu VERFÜLLEN') {
        const grubeAufDate = new Date(project.grube_auf_datum);
        const daysSinceGrubeAuf = Math.ceil((today.getTime() - grubeAufDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceGrubeAuf > 30) {
          notifications.push({
            title: `Grube lange offen - ${project.project_number}`,
            message: `Grube für Projekt ${project.project_number} ist seit ${daysSinceGrubeAuf} Tagen offen!`,
            type: 'warning',
            projectId: project.id,
            relatedEntity: 'grube_open_long',
            daysOpen: daysSinceGrubeAuf
          });
        }
      }

      // Material noch nicht gebucht nach 7 Tagen seit Projektstart
      if (project.start_date && !project.material_booking_completed) {
        const startDate = new Date(project.start_date);
        const daysSinceStart = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart > 7) {
          notifications.push({
            title: `Material noch nicht gebucht - ${project.project_number}`,
            message: `Material für Projekt ${project.project_number} seit ${daysSinceStart} Tagen nicht gebucht!`,
            type: 'warning',
            projectId: project.id,
            relatedEntity: 'material_not_booked',
            daysPending: daysSinceStart
          });
        }
      }

      // Dokumentation noch nicht erledigt nach Projektende
      if (project.end_date && !project.documentation_completed) {
        const endDate = new Date(project.end_date);
        const daysSinceEnd = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceEnd > 0) {
          notifications.push({
            title: `Dokumentation fehlt - ${project.project_number}`,
            message: `Dokumentation für Projekt ${project.project_number} seit Projektende (${daysSinceEnd} Tage) ausstehend!`,
            type: 'warning',
            projectId: project.id,
            relatedEntity: 'documentation_missing',
            daysPending: daysSinceEnd
          });
        }
      }
    }

    // Benachrichtigungen an alle Admin-User senden
    if (notifications.length > 0) {
      const users = await base44.asServiceRole.entities.User.list();
      const adminUsers = users.filter(u => u.role === 'admin');

      const notificationPromises = [];
      
      for (const admin of adminUsers) {
        for (const notif of notifications) {
          // Prüfe ob Benachrichtigung für diesen Tag bereits existiert
          const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
            user_id: admin.id,
            related_entity_id: notif.projectId,
            related_entity_type: notif.relatedEntity,
            created_date: { $gte: today.toISOString() }
          });

          if (existingNotifs.length === 0) {
            notificationPromises.push(
              base44.asServiceRole.entities.Notification.create({
                user_id: admin.id,
                type: 'system',
                title: notif.title,
                message: notif.message,
                link: `/app/ProjectDetail?id=${notif.projectId}`,
                related_entity_type: notif.relatedEntity,
                related_entity_id: notif.projectId,
                is_read: false
              })
            );
          }
        }
      }

      await Promise.all(notificationPromises);

      return Response.json({
        success: true,
        message: `${notifications.length} Benachrichtigungen erstellt`,
        notificationsCreated: notifications.length,
        adminUsersNotified: adminUsers.length
      });
    }

    return Response.json({
      success: true,
      message: 'Keine kritischen Ereignisse gefunden',
      notificationsCreated: 0
    });

  } catch (error) {
    console.error('Fehler beim Prüfen der Deadlines:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});