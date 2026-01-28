import { FileAudio, MousePointerClick } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-muted/20">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <FileAudio className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Файл не выбран</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Выберите файл из списка слева для просмотра транскрибации 
          или загрузите новое аудио для распознавания.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
          <MousePointerClick className="w-4 h-4" />
          <span>Нажмите на файл в списке</span>
        </div>
      </div>
    </div>
  );
}
