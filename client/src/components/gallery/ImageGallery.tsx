import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageIcon, RefreshCw, Info, CopyIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ImageGalleryProps {
  sessionId: string;
  onSelectImage?: (imageUrl: string, description: string) => void;
  height?: string;
}

interface GalleryImage {
  id: string;
  imageUrl: string;
  description: string;
  timestamp: string;
  isUserUploaded: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ 
  sessionId,
  onSelectImage,
  height = '400px'
}) => {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch gallery images
  const { 
    data: galleryData, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/image-gallery', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/image-gallery?sessionId=${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image gallery');
      }
      
      return response.json();
    },
    enabled: !!sessionId,
  });

  const handleImageClick = (image: GalleryImage) => {
    setSelectedImage(image);
    
    if (onSelectImage) {
      // If an external handler is provided, call it
      onSelectImage(image.imageUrl, image.description);
    } else {
      // Otherwise open the detail modal
      setIsModalOpen(true);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard',
        description: 'Image description copied to clipboard.',
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Image Gallery</h3>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-1" style={{ height }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-4 border rounded-md space-y-2">
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Failed to load images</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  const images = galleryData?.images || [];

  if (images.length === 0) {
    return (
      <div className="text-center p-4 border rounded-md space-y-2">
        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No images found</p>
        <p className="text-xs text-muted-foreground">
          Upload images in chat to see them here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Image Gallery</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
        
        <ScrollArea className="border rounded-md" style={{ height }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
            {images.map((image: GalleryImage) => (
              <Card 
                key={image.id} 
                className="overflow-hidden cursor-pointer relative group"
                onClick={() => handleImageClick(image)}
              >
                <img 
                  src={image.imageUrl} 
                  alt={image.description.substring(0, 30)} 
                  className="aspect-square object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-white text-xs line-clamp-2">
                    {image.description.substring(0, 50)}
                    {image.description.length > 50 ? '...' : ''}
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute top-1 right-1 rounded-full bg-background/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">{formatDate(image.timestamp)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Image Details</DialogTitle>
            <DialogDescription>
              Uploaded on {selectedImage && formatDate(selectedImage.timestamp)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <img 
                  src={selectedImage.imageUrl} 
                  alt={selectedImage.description} 
                  className="w-full object-contain max-h-[300px]"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-medium">Description</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0" 
                    onClick={() => handleCopyToClipboard(selectedImage.description)}
                  >
                    <CopyIcon className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedImage.description}
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
                {onSelectImage && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      onSelectImage(selectedImage.imageUrl, selectedImage.description);
                      setIsModalOpen(false);
                    }}
                  >
                    Use This Image
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageGallery;