# Интеграция Drag-and-Drop для Grid Layout

## Выполненные изменения

### Созданные файлы

1. **`frontend/public/assets/css/drag-drop-grid.css`** - Стили для drag-and-drop
   - Состояния перетаскивания (`.dragging`)
   - Placeholder стили (`.card-placeholder`)
   - Drag ghost стили (`.drag-ghost`)
   - Предотвращение выделения текста во время drag

2. **`frontend/public/assets/js/drag-drop-grid.js`** - Основной модуль drag-and-drop
   - Pointer Events API с fallback
   - Поддержка мыши, touch и клавиатуры
   - Placeholder + ghost стратегия
   - Интеграция с `resizeAllGridItems()` для masonry

### Измененные файлы

1. **`frontend/index.html`**
   - Добавлен `<link rel="stylesheet" href="/assets/css/drag-drop-grid.css" />`
   - Добавлен `<script src="/assets/js/drag-drop-grid.js" defer></script>`
   - Удален старый `dragndrop.css` и `dragndrop.js`

2. **`frontend/src/pages/Editor.tsx`**
   - Удален старый код drag-and-drop (useDragReorder hook)
   - Добавлена инициализация `DragDropGrid.init()` в `useEffect`
   - Элементы блоков теперь имеют:
     - `className="card"` (для селектора `.card`)
     - `data-id={b.id}` (уникальный ID)
     - `role="option"` и `aria-grabbed="false"` (accessibility)
     - `tabIndex={0}` (клавиатурная навигация)
   - Удален старый drag handle индикатор

3. **`frontend/public/assets/js/masonry-grid.js`**
   - Обновлена функция `resizeAllGridItems()` для поддержки HTMLElement
   - Добавлена глобальная экспорт `window.resizeAllGridItems`

### Backup файлы

- `frontend/public/assets/js/dragndrop.js.cursor.bak` (если существовал)
- `frontend/public/assets/css/dragndrop.css.cursor.bak` (если существовал)
- `frontend/src/pages/Editor.tsx.cursor.bak` и `Editor.tsx.cursor.bak2`

## Селекторы

- **Контейнер**: `.grid` (элемент с классом `grid`)
- **Элементы**: `.card` (элементы с классом `card`)
- **ID элементов**: `data-id` атрибут (содержит числовой ID блока)

## Как работает

1. При загрузке страницы Editor инициализируется `DragDropGrid.init()` с конфигурацией:
   - `containerSelector`: ref на grid контейнер
   - `itemSelector`: `.card`
   - `onUpdateOrder`: callback для сохранения порядка

2. При перетаскивании:
   - Создается ghost (копия элемента) который следует за курсором
   - Создается placeholder на месте оригинала
   - При движении определяется ближайший элемент по расстоянию
   - Placeholder перемещается в нужную позицию

3. При drop:
   - Оригинальный элемент вставляется на место placeholder
   - Вызывается `onUpdateOrder` с новым порядком ID
   - Вызывается `resizeAllGridItems()` для пересчета masonry
   - Порядок сохраняется на сервере через существующий API

## Клавиатурная навигация

- **Space/Enter**: Поднять элемент для перемещения
- **Стрелки**: Переместить placeholder в соседние позиции
- **Enter**: Разместить элемент
- **Escape**: Отменить перемещение

## Тестирование

### Мышь
1. Откройте `/editor`
2. Нажмите и удерживайте карточку
3. Переместите в другое место
4. Отпустите - карточка должна переместиться
5. Проверьте, что порядок сохранился

### Touch
1. На touch устройстве откройте `/editor`
2. Начните перетаскивание пальцем
3. Ghost следует за пальцем
4. Placeholder показывает место вставки
5. Отпустите - карточка перемещается

### Клавиатура
1. Tab к карточке
2. Space - элемент поднимается
3. Стрелки - перемещение placeholder
4. Enter - размещение элемента
5. Проверьте порядок

### Быстрый клик
- Обычный клик не должен инициировать drag
- Порог движения: 6px

### Динамические карточки
- MutationObserver автоматически добавляет `data-id` новым карточкам

## Особенности реализации

- ✅ Pointer Events API с fallback
- ✅ Правильное определение позиции для grid layout
- ✅ Placeholder предотвращает скачки блоков
- ✅ Ghost элемент для визуальной обратной связи
- ✅ Интеграция с masonry grid
- ✅ Клавиатурная навигация и accessibility
- ✅ Debounced сохранение порядка
- ✅ Предотвращение случайных drag при кликах

## Известные ограничения

- Автоинициализация отключена для React приложений (используется ручная инициализация в useEffect)
- Требуется наличие класса `.card` на элементах
- Требуется наличие `data-id` атрибута (добавляется автоматически если отсутствует)
