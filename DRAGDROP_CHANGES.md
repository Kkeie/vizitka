# Простая реализация Drag-and-Drop

## Изменения

Реализована простая и надежная система drag-and-drop для перестановки блоков.

### Добавленные файлы

1. **`frontend/public/assets/js/dragndrop.js`** - Простой модуль drag-and-drop
   - Поддержка mouse и touch событий
   - Минимальная функциональность: pick → move → drop
   - Placeholder для показа места вставки
   - Callback `onOrderChange` с новым порядком элементов

2. **`frontend/public/assets/css/dragndrop.css`** - Стили для drag-and-drop
   - Состояния перетаскивания
   - Placeholder стили
   - Плавные переходы

### Измененные файлы

1. **`frontend/index.html`** - Добавлены ссылки на CSS и JS
   ```html
   <link rel="stylesheet" href="/assets/css/dragndrop.css" />
   <script src="/assets/js/dragndrop.js" defer></script>
   ```

2. **`frontend/src/pages/Editor.tsx`** - Интеграция простого drag-and-drop
   - Удалена сложная реализация с spring-анимациями
   - Добавлена простая инициализация через `window.initDragDrop`
   - Используется существующий обработчик `handleOrderChange`

### Удаленные файлы (можно удалить после проверки)

- `frontend/src/lib/drag-reorder.ts` - сложная реализация
- `frontend/src/hooks/useDragReorder.ts` - React hook для сложной реализации
- `frontend/src/styles/drag-reorder.css` - стили для сложной реализации

## Использование

Drag-and-drop автоматически инициализируется на странице Editor при загрузке блоков.

### Селекторы

- **Контейнер**: `.grid` (элемент с классом `grid`)
- **Элементы**: `[data-drag-item]` (элементы с атрибутом `data-drag-item`)
- **ID элементов**: `data-block-id` или `id` атрибут

### Как работает

1. Пользователь нажимает на блок (mouse/touch)
2. Блок "подхватывается" и следует за курсором/пальцем
3. Показывается placeholder на месте будущей вставки
4. При отпускании блок вставляется в новую позицию
5. Вызывается `onOrderChange` с массивом ID в новом порядке
6. Порядок сохраняется на сервере

## Тестирование

1. Откройте страницу Editor (`/editor`)
2. Попробуйте перетащить блок мышью
3. Попробуйте перетащить блок на touch-устройстве
4. Проверьте, что placeholder показывается при перетаскивании
5. Проверьте, что порядок сохраняется после drop
6. Проверьте консоль на наличие ошибок

## Особенности

- ✅ Простая реализация без внешних зависимостей
- ✅ Поддержка mouse и touch событий
- ✅ GPU-ускорение через `translate3d`
- ✅ Placeholder для визуальной обратной связи
- ✅ Callback с новым порядком элементов
- ✅ Плавные переходы для эстетики

## Backup файлы

- `frontend/src/pages/Editor.tsx.cursor.bak` - оригинальная версия
- `frontend/src/pages/Editor.tsx.cursor.bak2` - версия перед изменениями
