import { useState, useRef, useEffect } from 'react';
import { Search, Replace, Trash2, Download, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatTime, getStatusLabel } from '@/utils/formatters';
import type { AudioFile, TranscriptionSegment } from '@/types/transcription';
import { toast } from 'sonner';

interface TranscriptionEditorProps {
  file: AudioFile;
  currentTime: number;
  onSeekTo: (time: number) => void;
  onUpdateSegment: (segmentId: string, updates: Partial<TranscriptionSegment>) => void;
  onUpdateSpeakerName: (oldName: string, newName: string) => void;
  onReplaceAll: (search: string, replace: string) => number | Promise<number>;
  onDeleteFile: () => void;
  onDeleteSegment: (segmentId: string) => void;
}

export function TranscriptionEditor({
  file,
  currentTime,
  onSeekTo,
  onUpdateSegment,
  onUpdateSpeakerName,
  onReplaceAll,
  onDeleteFile,
  onDeleteSegment,
}: TranscriptionEditorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const segments = file.segments || [];
  const currentSegmentIndex = segments.findIndex(
    s => currentTime >= s.start && currentTime < s.end
  );

  // Auto-scroll to current segment
  useEffect(() => {
    if (currentSegmentIndex >= 0 && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-segment-index="${currentSegmentIndex}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSegmentIndex]);

  const handleReplaceAll = async () => {
    if (!searchText.trim()) return;
    const count = await onReplaceAll(searchText, replaceText);
    if (count > 0) {
      toast.success(`Заменено: ${count} вхождений`);
      setSearchText('');
      setReplaceText('');
      setSearchOpen(false);
    } else {
      toast.info('Совпадений не найдено');
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Время', 'Спикер', 'Текст'],
      ...segments.map(s => [formatTime(s.start), s.speaker, `"${s.text.replace(/"/g, '""')}"`])
    ].map(row => row.join(',')).join('\n');
    
    downloadFile(csv, `${file.name}.csv`, 'text/csv');
    toast.success('Экспортировано в CSV');
  };

  const exportToTXT = () => {
    const txt = segments
      .map(s => `[${formatTime(s.start)}] ${s.speaker}: ${s.text}`)
      .join('\n\n');
    
    downloadFile(txt, `${file.name}.txt`, 'text/plain');
    toast.success('Экспортировано в TXT');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    processing: 'bg-primary/10 text-primary',
    ready: 'bg-green-100 text-green-700',
    error: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold truncate max-w-[400px]">{file.name}</h2>
            <Badge className={statusColors[file.status]}>
              {getStatusLabel(file.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(!searchOpen)}
              className={cn(searchOpen && "bg-accent")}
            >
              <Search className="w-4 h-4 mr-1.5" />
              Найти
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-1.5" />
                  Экспорт
                  <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  Экспорт в CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToTXT}>
                  Экспорт в TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteFile}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search & Replace */}
        {searchOpen && (
          <div className="flex items-center gap-2 pt-2 fade-in">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Найти..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="relative flex-1">
                <Replace className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Заменить на..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <Button size="sm" onClick={handleReplaceAll} disabled={!searchText.trim()}>
              Заменить все
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearchOpen(false)}
              className="h-9 w-9 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Transcription Table */}
      <div ref={tableRef} className="flex-1 overflow-y-auto">
        {segments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {file.status === 'processing' ? (
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p>Идёт распознавание...</p>
              </div>
            ) : file.status === 'pending' ? (
              <p>Нажмите "Распознать" для начала транскрибации</p>
            ) : (
              <p>Нет данных транскрибации</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 w-24">Начало</th>
                <th className="px-4 py-3 w-36">Голос</th>
                <th className="px-4 py-3">Текст</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {segments.map((segment, index) => (
                <SegmentRow
                  key={segment.id}
                  segment={segment}
                  index={index}
                  isActive={index === currentSegmentIndex}
                  searchText={searchText}
                  onTimeClick={() => onSeekTo(segment.start)}
                  onUpdateText={(text) => onUpdateSegment(segment.id, { text })}
                  onUpdateSpeaker={(newName) => onUpdateSpeakerName(segment.speaker, newName)}
                  onDelete={() => onDeleteSegment(segment.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

interface SegmentRowProps {
  segment: TranscriptionSegment;
  index: number;
  isActive: boolean;
  searchText: string;
  onTimeClick: () => void;
  onUpdateText: (text: string) => void;
  onUpdateSpeaker: (name: string) => void;
  onDelete: () => void;
}

function SegmentRow({
  segment,
  index,
  isActive,
  searchText,
  onTimeClick,
  onUpdateText,
  onUpdateSpeaker,
  onDelete,
}: SegmentRowProps) {
  const [editingSpeaker, setEditingSpeaker] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [speakerValue, setSpeakerValue] = useState(segment.speaker);
  const [textValue, setTextValue] = useState(segment.text);

  const highlightText = (text: string) => {
    if (!searchText.trim()) return text;
    const regex = new RegExp(`(${searchText})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">{part}</mark>
      ) : part
    );
  };

  const handleSpeakerBlur = () => {
    setEditingSpeaker(false);
    if (speakerValue !== segment.speaker && speakerValue.trim()) {
      onUpdateSpeaker(speakerValue);
    } else {
      setSpeakerValue(segment.speaker);
    }
  };

  const handleTextBlur = () => {
    setEditingText(false);
    if (textValue !== segment.text) {
      onUpdateText(textValue);
    }
  };

  return (
    <tr
      data-segment-index={index}
      className={cn(
        "group hover:bg-muted/30 transition-colors",
        isActive && "bg-primary/5"
      )}
    >
      <td className="px-4 py-3 align-top">
        <button onClick={onTimeClick} className="time-link">
          {formatTime(segment.start)}
        </button>
      </td>
      <td className="px-4 py-3 align-top">
        {editingSpeaker ? (
          <input
            autoFocus
            value={speakerValue}
            onChange={(e) => setSpeakerValue(e.target.value)}
            onBlur={handleSpeakerBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleSpeakerBlur()}
            className="editable-cell w-full text-sm font-medium bg-background border-primary"
          />
        ) : (
          <span
            onClick={() => setEditingSpeaker(true)}
            className="editable-cell inline-block text-sm font-medium cursor-pointer hover:bg-muted"
          >
            {segment.speaker}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        {editingText ? (
          <textarea
            autoFocus
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextBlur}
            className="editable-cell w-full text-sm resize-none bg-background border-primary min-h-[60px]"
            rows={2}
          />
        ) : (
          <p
            onClick={() => setEditingText(true)}
            className="editable-cell text-sm leading-relaxed cursor-pointer hover:bg-muted"
          >
            {highlightText(segment.text)}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
}
