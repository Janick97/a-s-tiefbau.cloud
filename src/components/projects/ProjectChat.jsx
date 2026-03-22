import React, { useState, useEffect, useRef } from 'react';
import { ProjectComment, User, ProjectDocument } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Paperclip, X, Download, DownloadCloud } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { UploadFile } from "@/integrations/Core";
// import { useChatNotifications } from '@/components/contexts/ChatNotificationContext';

const getInitials = (name) => {
  if (!name) return '';
  const names = name.split(' ');
  if (names.length === 1) return names[0][0]?.toUpperCase() || '';
  return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
};

function ImagePreviewModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={onClose}>
      
            <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={(e) => e.stopPropagation()}>
        
                <img src={imageUrl} alt="Vollbild-Vorschau" className="w-full h-full object-contain rounded-lg" />
                <div className="absolute top-4 right-4 flex gap-2">
                    <a href={imageUrl} download target="_blank" rel="noopener noreferrer">
                         <Button variant="secondary">
                            <Download className="w-4 h-4 mr-2" />
                            Herunterladen
                         </Button>
                    </a>
                    <Button onClick={onClose} variant="secondary">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </motion.div>
        </motion.div>);

}

function Comment({ comment, onImageClick }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50/80">
            <Avatar className="h-10 w-10 border">
                <AvatarFallback>{getInitials(comment.user_full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <p className="font-semibold text-gray-800">{comment.user_full_name}</p>
                    <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: de })}
                    </p>
                </div>
                {comment.comment && <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>}
                {comment.attachments && comment.attachments.length > 0 &&
        <div className="mt-2 flex flex-wrap gap-2">
                        {comment.attachments.map((url, index) =>
          <img
            key={index}
            src={url}
            alt={`Anhang ${index + 1}`}
            className="h-24 w-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onImageClick(url)} />

          )}
                    </div>
        }
            </div>
        </div>);

}

export default function ProjectChat({ projectId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const commentsEndRef = useRef(null);
  const fileInputRef = useRef(null);
  // const { addNotification } = useChatNotifications();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [user, projectComments] = await Promise.all([
      User.me(),
      ProjectComment.filter({ project_id: projectId }, 'created_date')]
      );
      setCurrentUser(user);
      setComments(Array.isArray(projectComments) ? projectComments : []);
    } catch (error) {
      console.error("Fehler beim Laden der Kommentare:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    loadData();

    const unsubscribe = ProjectComment.subscribe((event) => {
      if (event.type === 'create' && event.data?.project_id === projectId) {
        setComments((prev) => {
          // Avoid duplicates
          if (prev.some((c) => c.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
      }
    });

    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = files.map((file) => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map((res) => res.file_url);
      // Directly submit if no text – just photos
      const newUrls = urls;
      if (!newComment.trim()) {
        // Send immediately with just the photos
        if (currentUser) {
          setIsSubmitting(true);
          await ProjectComment.create({
            project_id: projectId,
            comment: "",
            attachments: newUrls,
            user_full_name: currentUser.full_name
          });
          for (const url of newUrls) {
            const fileName = url.split('/').pop() || 'chat-foto.jpg';
            await ProjectDocument.create({
              project_id: projectId,
              file_name: fileName,
              file_url: url,
              file_type: 'image/jpeg',
              folder: 'Chat-Dateien',
              description: 'Aus Chat hochgeladen',
              uploaded_by: currentUser.full_name
            });
          }
          setIsSubmitting(false);
        }
      } else {
        setAttachments((prev) => [...prev, ...newUrls]);
      }
    } catch (error) {
      console.error("Upload-Fehler", error);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (urlToRemove) => {
    setAttachments((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && attachments.length === 0 || !currentUser) return;

    setIsSubmitting(true);
    try {
      await ProjectComment.create({
        project_id: projectId,
        comment: newComment,
        attachments: attachments,
        user_full_name: currentUser.full_name
      });

      // Auch im Anlagenkorb speichern (Chat-Dateien Ordner)
      if (attachments.length > 0) {
        for (const url of attachments) {
          const fileName = url.split('/').pop() || 'chat-datei.jpg';
          const fileType = url.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg';

          await ProjectDocument.create({
            project_id: projectId,
            file_name: fileName,
            file_url: url,
            file_type: fileType,
            folder: 'Chat-Dateien',
            description: newComment.trim() || 'Aus Chat hochgeladen',
            uploaded_by: currentUser.full_name
          });
        }
      }

      setNewComment("");
      setAttachments([]);
    } catch (error) {
      console.error("Fehler beim Senden des Kommentars:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadAllMedia = async () => {
    const allMedia = [];
    comments.forEach((comment) => {
      if (comment.attachments && comment.attachments.length > 0) {
        allMedia.push(...comment.attachments);
      }
    });

    if (allMedia.length === 0) {
      alert("Keine Medien zum Herunterladen vorhanden.");
      return;
    }

    for (let i = 0; i < allMedia.length; i++) {
      const url = allMedia[i];
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `chat_media_${i + 1}.${blob.type.split('/')[1] || 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Kleine Verzögerung zwischen Downloads
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Fehler beim Herunterladen von ${url}:`, error);
      }
    }
  };

  return (
    <>
            <Card className="card-elevation border-none flex flex-col h-full">
                











        
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ?
          <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div> :
          comments.length > 0 ?
          comments.map((comment) => <Comment key={comment.id} comment={comment} onImageClick={setPreviewImage} />) :

          <div className="text-center text-gray-500 py-8">
                            Noch keine Kommentare vorhanden.
                        </div>
          }
                    <div ref={commentsEndRef} />
                </CardContent>
                {attachments.length > 0 &&
        <div className="p-2 border-t flex flex-wrap gap-2">
                        {attachments.map((url) =>
          <div key={url} className="relative">
                                <img src={url} alt="Vorschau" className="h-16 w-16 object-cover rounded-md" />
                                <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
              onClick={() => removeAttachment(url)}>
              
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
          )}
                    </div>
        }
                <CardFooter className="p-4 border-t bg-gray-50">
                    <form onSubmit={handleSubmit} className="flex w-full items-start gap-3">
                        

            
                        <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Schreibe einen Kommentar..."
              className="flex-1 resize-none bg-white"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isSubmitting || isUploading} />
            
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple hidden accept="image/*,.pdf" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting || isUploading}>
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || isUploading || !newComment.trim() && attachments.length === 0}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </form>
                </CardFooter>
            </Card>
            <AnimatePresence>
              <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
            </AnimatePresence>
        </>);

}