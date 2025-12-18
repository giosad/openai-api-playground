'use client';

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Switch,
  Text,
  Textarea,
} from '@/components/ui';
import openai from '@/lib/openai';
import { cn } from '@/lib/utils';
import {
  Eraser,
  MessageSquare,
  PlayCircle,
  Plus,
  RotateCw,
} from 'lucide-react';
import type {
  Assistant,
  AssistantTool,
} from 'openai/resources/beta/assistants';
import type { TextContentBlock } from 'openai/resources/beta/threads/messages';
import type { Thread } from 'openai/resources/beta/threads/threads';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const models = [
  { name: 'gpt-4o' },
  { name: 'gpt-4-turbo' },
  { name: 'gpt-3.5-turbo' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const newAssistant: Partial<Assistant> = {
  id: '0',
  name: '',
  instructions: '',
  model: '',
  tools: [],
};

const Assistants = () => {
  const [assistants, setAssistants] = useState<Partial<Assistant>[]>([]);
  const [activeAssistant, setActiveAssistant] = useState<Partial<Assistant>>();
  const [saving, setSaving] = useState<boolean>(false);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [running, setRunning] = useState<boolean>(false);

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = () => {
    openai.beta.assistants.list().then((res) => {
      setAssistants(res.data);
      if (res.data.length > 0) setActiveAssistant(res.data[0]);
      else setActiveAssistant(newAssistant);
    });
  };

  const handleToolChange = (
    tool: 'function' | 'code_interpreter' | 'file_search',
    checked: boolean
  ) => {
    if (!activeAssistant || !activeAssistant.tools) return;
    const tools = [...activeAssistant.tools];
    if (checked) tools.push({ type: tool } as AssistantTool);
    else
      tools.splice(
        tools.findIndex((t) => t.type === tool),
        1
      );
    setActiveAssistant({ ...activeAssistant, tools: tools });
  };

  const handleSaveActiveAssistant = () => {
    if (!activeAssistant || !activeAssistant.id) return;
    setSaving(true);
    if (activeAssistant.id === '0')
      openai.beta.assistants
        .create({
          name: activeAssistant.name,
          instructions: activeAssistant.instructions,
          model: activeAssistant.model as string,
          tools: activeAssistant.tools,
        })
        .then(() => {
          fetchAssistants();
        })
        .finally(() => {
          setSaving(false);
        });
    else
      openai.beta.assistants
        .update(activeAssistant.id, {
          name: activeAssistant.name,
          instructions: activeAssistant.instructions,
          model: activeAssistant.model,
          tools: activeAssistant.tools,
        })
        .then(() => {
          fetchAssistants();
        })
        .finally(() => {
          setSaving(false);
        });
  };

  const handleDeleteActiveAssistant = () => {
    if (!activeAssistant?.id) return;
    openai.beta.assistants.delete(activeAssistant.id).then(() => {
      fetchAssistants();
    });
  };

  const handleAddMessageClick = () => {
    addMessage(thread?.id);
  };

  const handleInputMessageKeyUp = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      addMessage(thread?.id);
      event.preventDefault();
    }
  };

  const addMessage = (threadId?: string) => {
    if (!threadId) createThread();
    else createMessage(threadId);
  };

  const createThread = () => {
    openai.beta.threads.create().then((res) => {
      setThread(res);
      createMessage(res.id);
    });
  };

  const createMessage = (threadId: string) => {
    openai.beta.threads.messages
      .create(threadId, { role: 'user', content: inputMessage })
      .then(() => {
        setMessages([...messages, { role: 'user', content: inputMessage }]);
        setInputMessage('');
      });
  };

  const handleCreateRun = () => {
    if (!activeAssistant?.id || !thread?.id) return;
    setRunning(true);
    openai.beta.threads.runs
      .create(thread.id, {
        assistant_id: activeAssistant.id,
      })
      .then((res) => {
        checkRunStatus(res.id);
      });
  };

  const checkRunStatus = (runId: string) => {
    openai.beta.threads.runs
      .retrieve(runId, { thread_id: thread?.id as string })
      .then((res) => {
        if (res.status === 'completed') retrieveMessages();
        else setTimeout(() => checkRunStatus(runId), 1000);
      });
  };

  const retrieveMessages = () => {
    openai.beta.threads.messages.list(thread?.id as string).then((res) => {
      setMessages(
        res.data
          .map((m) => ({
            role: m.role,
            content: (m.content[0] as TextContentBlock).text.value,
          }))
          .reverse()
      );
      setRunning(false);
    });
  };

  const handleClear = () => {
    setThread(null);
    setMessages([]);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full w-full flex gap-6 overflow-hidden px-4 py-6">
      <div className="hidden lg:flex flex-col w-1/4 h-full gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Label>Assistant</Label>
            <Select
              name="assistants"
              value={activeAssistant?.id}
              onValueChange={(value) =>
                setActiveAssistant(
                  assistants.find((assistant) => assistant.id === value) ??
                    newAssistant
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">New Assistant</SelectItem>
                <SelectSeparator />
                {assistants.length === 0 && (
                  <Text variant="muted" className="pl-8 py-2">
                    You don&apos;t have any assistants.
                  </Text>
                )}
                {assistants.map((assistant, index) => (
                  <SelectItem key={index} value={assistant.id as string}>
                    {assistant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <Label>Name</Label>
            <Input
              placeholder="Enter a name for your assistant"
              value={activeAssistant?.name ?? ''}
              onChange={(e) =>
                setActiveAssistant({ ...activeAssistant, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Instructions</Label>
            <Textarea
              placeholder="You are a helpful assistant."
              value={activeAssistant?.instructions ?? ''}
              rows={4}
              onChange={(e) =>
                setActiveAssistant({
                  ...activeAssistant,
                  instructions: e.target.value,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label>Model</Label>
            <Select
              name="model"
              value={activeAssistant?.model}
              onValueChange={(value) =>
                setActiveAssistant({ ...activeAssistant, model: value })
              }
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
            <Text variant="muted">Tools</Text>
            <hr />
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <Label>Functions</Label>
                <Switch
                  name="functions"
                  checked={activeAssistant?.tools?.some(
                    (t) => t.type === 'function'
                  )}
                  onCheckedChange={(checked) =>
                    handleToolChange('function', checked)
                  }
                />
              </div>
              <div className="flex justify-between items-center">
                <Label>Code Interpreter</Label>
                <Switch
                  name="code_interpreter"
                  checked={activeAssistant?.tools?.some(
                    (t) => t.type === 'code_interpreter'
                  )}
                  onCheckedChange={(checked) =>
                    handleToolChange('code_interpreter', checked)
                  }
                />
              </div>
              <div className="flex justify-between items-center">
                <Label>File Search</Label>
                <Switch
                  name="file_search"
                  checked={activeAssistant?.tools?.some(
                    (t) => t.type === 'file_search'
                  )}
                  onCheckedChange={(checked) =>
                    handleToolChange('file_search', checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>
        {activeAssistant && (
          <div className="flex gap-4">
            {activeAssistant.id !== '0' && (
              <Button
                className="flex-1"
                variant="destructive"
                onClick={handleDeleteActiveAssistant}
              >
                Delete
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleSaveActiveAssistant}
              disabled={saving}
            >
              {saving && <RotateCw className="mr-2 h-4 w-4 animate-spin" />}{' '}
              {activeAssistant?.id === '0' ? 'Create' : 'Save'}
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-4">
        {thread && (
          <div className="flex gap-4">
            <Text variant="muted">{thread.id}</Text>
            <Button
              variant="link"
              className="p-0 text-destructive"
              onClick={handleClear}
            >
              <Eraser size={14} className="mr-1" /> Clear
            </Button>
          </div>
        )}
        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          {messages.length === 0 && (
            <div className="w-full h-full flex flex-col justify-center items-center gap-3">
              <MessageSquare />
              <Text variant="medium">
                Send a message to start chat with your assistant.
              </Text>
            </div>
          )}
          {messages.map((message, index) => (
            <Text
              key={index}
              className={cn(
                'p-3 border rounded-md w-fit',
                message.role === 'assistant' && 'bg-secondary',
                message.role === 'user' && 'ml-auto'
              )}
            >
              <Markdown remarkPlugins={[remarkGfm]}>
                {message.content as string}
              </Markdown>
            </Text>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-4">
          <Input
            name="inputMessage"
            className="flex-1"
            placeholder="Enter your message"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyUp={handleInputMessageKeyUp}
          />
          <Button onClick={handleAddMessageClick} variant="outline">
            <Plus size={18} />
          </Button>
          <Button
            onClick={handleCreateRun}
            disabled={
              !activeAssistant ||
              activeAssistant.id === '0' ||
              !thread ||
              running
            }
          >
            <PlayCircle
              size={18}
              className={cn('mr-2', running && 'animate-spin')}
            />
            Run
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Assistants;
