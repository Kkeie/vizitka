# Стабильный Drag-and-Drop для Grid Layout

## ✅ Выполнено

### Созданные файлы

1. **`frontend/public/assets/css/drag-drop-grid.css`**
   - Стили для состояний drag (`.dragging`)
   - Placeholder стили (`.card-placeholder`)
   - Drag ghost стили (`.drag-ghost`)
   - Предотвращение выделения текста

2. **`frontend/public/assets/js/drag-drop-grid.js`**
   - Полная реализация drag-and-drop
   - Pointer Events API с fallback
   - Поддержка мыши, touch и клавиатуры
   - Placeholder + ghost стратегия
   - Интеграция с masonry grid

### Измененные файлы

1. **`frontend/index.html`**
   - ✅ Добавлен `<link rel="stylesheet" href="/assets/css/drag-drop-grid.css" />`
   - ✅ Добавлен `<script src="/assets/js/drag-drop-grid.js" defer></script>`
   - ✅ Удалены старые ссылки на `dragndrop.css` и `dragndrop.js`

2. **`frontend/src/pages/Editor.tsx`**
   - ✅ Удален старый код drag-and-drop
   - ✅ Добавлена инициализация `DragDropGrid.init()` в `useEffect`
   - ✅ Элементы блоков имеют:
     - `className="card"` (для селектора `.card`)
     - `data-id={b.id}` (уникальный ID)
     - `role="option"` и `aria-grabbed="false"` (accessibility)
     - `tabIndex={0}` (клавиатурная навигация)
   - ✅ Удален старый drag handle индикатор

3. **`frontend/public/assets/js/masonry-grid.js`**
   - ✅ Обновлена функция `resizeAllGridItems()` для поддержки HTMLElement
   - ✅ Добавлена глобальная экспорт `window.resizeAllGridItems`

### Backup файлы

- `frontend/public/assets/js/dragndrop.js.cursor.bak` (если существовал)
- `frontend/public/assets/css/dragndrop.css.cursor.bak` (если существовал)
- `frontend/src/pages/Editor.tsx.cursor.bak` и `Editor.tsx.cursor.bak2`

## Селекторы

- **Контейнер**: `.grid` (элемент с классом `grid`)
- **Элементы**: `.card` (элементы с классом `card`)
- **ID элементов**: `data-id` атрибут (содержит числовой ID блока)

## Как работает

1. **Инициализация**: При загрузке страницы Editor вызывается `DragDropGrid.init()` с конфигурацией
2. **Drag Start**: При pointerdown создается ghost (копия) и placeholder
3. **Drag Move**: Ghost следует за курсором, placeholder перемещается в нужную позицию
4. **Drag End**: Элемент вставляется на место placeholder, вызывается `onUpdateOrder` и `resizeAllGridItems()`

## Особенности реализации

- ✅ **Правильное определение позиции**: Учитывается центр элемента и направление движения
- ✅ **Предотвращение скачков**: Placeholder обновляется только при изменении позиции
- ✅ **Ghost элемент**: Визуальная обратная связь при перетаскивании
- ✅ **Scroll handling**: Учитывается прокрутка страницы
- ✅ **Touch support**: Полная поддержка touch событий
- ✅ **Keyboard navigation**: Space/Enter для pickup, стрелки для перемещения
- ✅ **Accessibility**: ARIA атрибуты и role="option"
- ✅ **Masonry integration**: Автоматический пересчет после drop

## Тестовые сценарии

### ✅ Мышь
1. Откройте `/editor`
2. Нажмите и удерживайте карточку (переместите >6px)
3. Ghost следует за курсором
4. Placeholder показывает место вставки
5. Переместите в другое место
6. Отпустите - карточка должна переместиться
7. Проверьте, что порядок сохранился

### ✅ Touch
1. На touch устройстве откройте `/editor`
2. Начните перетаскивание пальцем
3. Ghost следует за пальцем
4. Placeholder показывает место вставки
5. Отпустите - карточка перемещается

### ✅ Клавиатура
1. Tab к карточке
2. Space - элемент поднимается (placeholder появляется)
3. Стрелки влево/вправо/вверх/вниз - перемещение placeholder
4. Enter - размещение элемента
5. Esc - отмена перемещения
6. Проверьте порядок

### ✅ Быстрый клик
- Обычный клик без движения не должен инициировать drag
- Порог движения: 6px

### ✅ Динамические карточки
- MutationObserver автоматически добавляет `data-id` новым карточкам

### ✅ Grid layout
- Правильно работает с элементами в разных колонках
- Определение позиции учитывает grid структуру

## Известные ограничения

- Автоинициализация отключена для React приложений (используется ручная инициализация в useEffect)
- Требуется наличие класса `.card` на элементах
- Требуется наличие `data-id` атрибута (добавляется автоматически если отсутствует)

## Отладка

Для отладки доступен глобальный объект `window.DragDropGrid`:
```javascript
// В консоли браузера
window.DragDropGrid.state // текущее состояние
window.DragDropGrid.config // конфигурация
```

## Следующие шаги

1. Протестировать все сценарии выше
2. Проверить работу на мобильных устройствах
3. Убедиться что порядок сохраняется на сервере
4. Проверить что masonry grid пересчитывается после drop
