'use client';

import { LoadingSVG } from '@/components/svgs/LoadingSVG';
import {
  Button,
  Input,
  Label,
  Link,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Text,
} from '@/components/ui';
import openai from '@/lib/openai';
import {
  ArrowUpRight,
  Download,
  ExternalLink,
  MessageSquare,
  Pencil,
  Send,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const models = [
  { name: 'gpt-image-1.5' },
  { name: 'gpt-image-1' },
  { name: 'gpt-image-1-mini' },
  { name: 'chatgpt-image-latest' },
  { name: 'dall-e-3' },
  { name: 'dall-e-2' },
];

const styles = [{ name: 'vivid' }, { name: 'natural' }];

interface ImageMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: number;
  userPrompt?: string;
  uploadedImage?: {
    preview: string;
    name: string;
    type: string;
  };
  generatedImages?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  options?: {
    model: string;
    count: number;
    style: string;
    size: string;
  };
  errorMessage?: string;
  generationTime?: number; // Time in milliseconds
}

const Images = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [pendingGeneration, setPendingGeneration] = useState<boolean>(false);
  const [options, setOptions] = useState<{
    model: string;
    count: number;
    style: string;
    size: string;
  }>({
    model: 'gpt-image-1.5',
    count: 1,
    style: 'vivid',
    size: 'auto',
  });
  const [messages, setMessages] = useState<ImageMessage[]>([]);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'last-result' | 'original-input'>(
    'last-result'
  );
  const [originalInputImage, setOriginalInputImage] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [resizeOption, setResizeOption] = useState<
    'original' | '1000' | '2000'
  >('original');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resizeImage = async (
    file: File,
    maxDimension: number
  ): Promise<File> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
              });
              resolve(resizedFile);
            }
          },
          file.type,
          0.95
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageFile = async (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    let fileToUpload: File = file;

    // If type is not set or is generic, try to infer from file extension and recreate
    if (!file.type || file.type === 'application/octet-stream') {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let mimeType = '';

      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg')
        mimeType = 'image/jpeg';
      else if (extension === 'webp') mimeType = 'image/webp';

      if (mimeType) {
        // Read file as blob and create new File with correct mime type
        const blob = await file.arrayBuffer();
        fileToUpload = new File([blob], file.name, { type: mimeType });
      }
    }

    if (validTypes.includes(fileToUpload.type)) {
      setUploadedImage(fileToUpload);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setImagePreview(preview);
        // Store as original input if not set yet
        if (!originalInputImage) {
          setOriginalInputImage({ file: fileToUpload, preview });
        }
      };
      reader.readAsDataURL(fileToUpload);
    } else {
      alert('Invalid file type. Please upload a PNG, JPEG, or WebP image.');
    }
  };

  const handleUseImageForEdit = async (base64Image: string) => {
    // Convert base64 to File
    const response = await fetch(base64Image);
    const blob = await response.blob();
    const file = new File([blob], 'edited-image.png', { type: 'image/png' });

    setUploadedImage(file);
    setImagePreview(base64Image);
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setImagePreview('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleSend = async () => {
    if (!prompt) return;

    // Create user message
    const userMessage: ImageMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: 'user',
      timestamp: Date.now(),
      userPrompt: prompt,
      uploadedImage: uploadedImage
        ? {
            preview: imagePreview,
            name: uploadedImage.name,
            type: uploadedImage.type,
          }
        : undefined,
      options: { ...options },
    };

    // Determine which image to use for API call
    let imageForAPI = uploadedImage;

    // If no new upload, check edit mode
    if (!imageForAPI) {
      if (editMode === 'last-result') {
        // Use last generated image
        const lastAssistantMsg = [...messages]
          .reverse()
          .find((m) => m.role === 'assistant' && m.generatedImages?.length);
        if (lastAssistantMsg?.generatedImages?.[0]) {
          const lastImg = lastAssistantMsg.generatedImages[0];
          const imgSrc =
            lastImg.url || `data:image/png;base64,${lastImg.b64_json}`;
          const response = await fetch(imgSrc);
          const blob = await response.blob();
          imageForAPI = new File([blob], 'last-result.png', {
            type: 'image/png',
          });
        }
      } else if (editMode === 'original-input' && originalInputImage) {
        // Use original input image
        imageForAPI = originalInputImage.file;
      }
    }

    // Resize image if needed
    if (imageForAPI && resizeOption !== 'original') {
      const maxDimension = resizeOption === '1000' ? 1000 : 2000;
      imageForAPI = await resizeImage(imageForAPI, maxDimension);
    }

    // Update messages and clear current input (not original)
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setUploadedImage(null);
    setImagePreview('');
    setPendingGeneration(true);

    const startTime = Date.now();

    try {
      let response;
      if (imageForAPI) {
        // Edit endpoint
        const isGPTImageModel =
          options.model.startsWith('gpt-image') ||
          options.model === 'chatgpt-image-latest';
        response = await openai.images.edit({
          model: options.model,
          image: isGPTImageModel ? ([imageForAPI] as any) : imageForAPI,
          prompt: userMessage.userPrompt!,
          n: options.count,
          size: options.size as any,
        });
      } else {
        // Generate endpoint
        response = await openai.images.generate({
          model: options.model,
          prompt: userMessage.userPrompt!,
          n: options.count,
          size: options.size as any,
          ...(options.model === 'dall-e-3' && { style: options.style as any }),
        });
      }

      // Create assistant message
      const endTime = Date.now();
      const assistantMessage: ImageMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        timestamp: endTime,
        generatedImages: response.data,
        options: { ...options },
        generationTime: endTime - startTime,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      // Create error assistant message
      const errorMessage: ImageMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'assistant',
        timestamp: Date.now(),
        errorMessage: err.message,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setPendingGeneration(false);
    }
  };

  const handleInputMessageKeyUp = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      handleSend();
      event.preventDefault();
    }
  };

  return (
    <div className="h-full w-full flex overflow-hidden px-4 py-6 gap-4">
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1 overflow-auto flex flex-col gap-4 p-4">
          {messages.length === 0 && !pendingGeneration && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              <MessageSquare />
              <Text variant="medium">Send a prompt to generate images</Text>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-start' : 'justify-end'
              )}
            >
              {message.role === 'user' ? (
                <div className="flex gap-3 p-3 border rounded-md bg-background max-w-[70%]">
                  {message.uploadedImage && (
                    <Image
                      src={message.uploadedImage.preview}
                      alt="Uploaded"
                      width={80}
                      height={80}
                      className="rounded border object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex flex-col gap-1">
                    <Text variant="muted">You:</Text>
                    <Text>{message.userPrompt}</Text>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-3 border rounded-md bg-secondary max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <Text variant="muted">Generated:</Text>
                    {message.generationTime && (
                      <Text variant="muted">
                        ({(message.generationTime / 1000).toFixed(2)}s)
                      </Text>
                    )}
                  </div>
                  {message.errorMessage ? (
                    <div className="flex gap-2 items-center text-red-500">
                      <XCircle size={20} />
                      <Text>{message.errorMessage}</Text>
                    </div>
                  ) : message.generatedImages ? (
                    <div
                      className={cn(
                        'grid gap-2',
                        message.generatedImages.length > 4
                          ? 'grid-cols-3'
                          : 'grid-cols-2'
                      )}
                    >
                      {message.generatedImages.map((img, idx) => {
                        const imgSrc =
                          img.url || `data:image/png;base64,${img.b64_json}`;
                        return (
                          <div key={idx} className="relative group">
                            <Image
                              src={imgSrc}
                              alt={message.userPrompt || 'Generated'}
                              width={256}
                              height={256}
                              className="rounded border"
                            />
                            {/* Edit button - top left */}
                            <Button
                              size="small"
                              variant="secondary"
                              className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => handleUseImageForEdit(imgSrc)}
                              title="Edit image"
                            >
                              <Pencil size={16} />
                            </Button>
                            {/* Open button - top right */}
                            <Button
                              size="small"
                              variant="secondary"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => {
                                const newWindow = window.open();
                                if (newWindow) {
                                  newWindow.document.write(
                                    `<img src="${imgSrc}" style="max-width:100%;height:auto;">`
                                  );
                                  newWindow.document.title = 'Generated Image';
                                }
                              }}
                              title="Open in new tab"
                            >
                              <ExternalLink size={16} />
                            </Button>
                            {/* Download button - bottom right */}
                            <Button
                              size="small"
                              variant="secondary"
                              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = imgSrc;
                                link.download = `generated-${Date.now()}-${idx}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              title="Download image"
                            >
                              <Download size={16} />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}

          {pendingGeneration && (
            <div className="flex justify-end">
              <div className="flex gap-2 items-center p-3 border rounded-md bg-secondary">
                <LoadingSVG />
                <Text variant="muted">Generating...</Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        <div
          className={`flex flex-col gap-4 p-4 rounded-lg border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-transparent'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {imagePreview && (
            <div className="relative w-fit">
              <Image
                src={imagePreview}
                alt="Upload preview"
                width={200}
                height={200}
                className="rounded border"
              />
              <Button
                size="small"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={handleClearImage}
              >
                <XCircle size={16} />
              </Button>
            </div>
          )}
          <div className="flex gap-4">
            <Input
              name="userMessage"
              className="flex-1"
              placeholder={
                isDragging
                  ? 'Drop image here...'
                  : 'Enter your prompt or drag & drop an image'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyUp={handleInputMessageKeyUp}
            />
            <Button onClick={handleSend}>
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
      <div className="hidden lg:flex flex-col lg:w-1/4 xl:w-1/5 gap-6">
        <Button
          variant="outline"
          onClick={() => {
            if (confirm('Clear all message history?')) {
              setMessages([]);
              setOriginalInputImage(null);
            }
          }}
          className="w-full"
        >
          Clear History
        </Button>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>Edit Mode</Label>
            <Switch
              checked={editMode === 'last-result'}
              onCheckedChange={(checked) =>
                setEditMode(checked ? 'last-result' : 'original-input')
              }
            />
          </div>
          <Text variant="muted">
            {editMode === 'last-result'
              ? 'Editing last result'
              : 'Editing original input'}
          </Text>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Resize Input</Label>
          <Select
            name="resize"
            value={resizeOption}
            onValueChange={(value: 'original' | '1000' | '2000') =>
              setResizeOption(value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select resize option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">Original size</SelectItem>
              <SelectItem value="1000">Max 1000x1000</SelectItem>
              <SelectItem value="2000">Max 2000x2000</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label>Model</Label>
          <Select
            name="model"
            value={options.model}
            onValueChange={(value) => setOptions({ ...options, model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model, index) => (
                <SelectItem key={index} value={model.name}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-3">
          <Label>N</Label>
          <Input
            name="count"
            type="number"
            min={1}
            max={10}
            placeholder="Count"
            value={options.count}
            onChange={(e) =>
              setOptions({ ...options, count: Number(e.target.value) })
            }
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label>Size</Label>
          <Select
            name="size"
            value={options.size}
            onValueChange={(value) => setOptions({ ...options, size: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select image size" />
            </SelectTrigger>
            <SelectContent>
              {/* GPT Image models support different sizes */}
              {(options.model.startsWith('gpt-image') ||
                options.model === 'chatgpt-image-latest') && (
                <>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="1024x1024">1024x1024</SelectItem>
                  <SelectItem value="1536x1024">
                    1536x1024 (landscape)
                  </SelectItem>
                  <SelectItem value="1024x1536">
                    1024x1536 (portrait)
                  </SelectItem>
                </>
              )}
              {/* DALL-E 2 sizes */}
              {options.model === 'dall-e-2' && (
                <>
                  <SelectItem value="256x256">256x256</SelectItem>
                  <SelectItem value="512x512">512x512</SelectItem>
                  <SelectItem value="1024x1024">1024x1024</SelectItem>
                </>
              )}
              {/* DALL-E 3 sizes */}
              {options.model === 'dall-e-3' && (
                <>
                  <SelectItem value="1024x1024">1024x1024</SelectItem>
                  <SelectItem value="1792x1024">
                    1792x1024 (landscape)
                  </SelectItem>
                  <SelectItem value="1024x1792">
                    1024x1792 (portrait)
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        {options.model === 'dall-e-3' && (
          <div className="flex flex-col gap-3">
            <Label>Style</Label>
            <Select
              name="style"
              value={options.style}
              onValueChange={(value) =>
                setOptions({ ...options, style: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {styles.map((style, index) => (
                  <SelectItem key={index} value={style.name}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Link
          href="https://platform.openai.com/docs/guides/images"
          target="_blank"
        >
          Learn more about image generation <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default Images;
