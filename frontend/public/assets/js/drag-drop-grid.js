// Drag and Drop для Grid Layout с поддержкой masonry
(function() {
  'use strict';

  const DragDropGrid = {
    state: {
      isDragging: false,
      draggedElement: null,
      placeholder: null,
      ghost: null,
      startIndex: -1,
      currentIndex: -1,
      startY: 0,
      startX: 0,
      _boundDragOver: null,
      _boundDrop: null,
      _boundDragEnd: null,
      _container: null,
    },

    config: {
      containerSelector: '.blocks-grid',
      itemSelector: '.card',
      onUpdateOrder: null,
    },

    init: function(config = {}) {
      this.config = { ...this.config, ...config };
      var container = typeof this.config.containerSelector === 'string'
        ? document.querySelector(this.config.containerSelector)
        : this.config.containerSelector;

      if (!container) {
        console.warn('[DragDropGrid] Container not found:', this.config.containerSelector);
        return;
      }
      this.config._container = container;

      // Устанавливаем draggable на все карточки
      this.setupItems(container);
      
      // Наблюдаем за добавлением новых элементов
      const observer = new MutationObserver(() => {
        this.setupItems(container);
      });
      observer.observe(container, { childList: true, subtree: true });
    },

    setupItems: function(container) {
      // Ищем все элементы-обертки с data-id
      const wrappers = container.querySelectorAll('[data-id]');
      wrappers.forEach((wrapper) => {
        const card = wrapper.querySelector(this.config.itemSelector) || wrapper;
        if (!card) return;

        // Убеждаемся что есть data-id на wrapper
        const id = wrapper.getAttribute('data-id');
        if (!id) return;

        // Убираем старые обработчики
        card.removeEventListener('pointerdown', this.handlePointerDown);
        card.removeEventListener('dragstart', this.handleDragStart);
        
        // Добавляем обработчики на карточку
        card.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', this.handleDragStart.bind(this));
        
        // Сохраняем связь между card и wrapper
        (card as any)._dragWrapper = wrapper;
      });
    },

    handlePointerDown: function(e) {
      // Игнорируем клики на кнопки и ссылки — пусть срабатывает нативный drag
      if (e.target.closest('button, a, input, textarea')) {
        return;
      }
    },

    handleDragStart: function(e) {
      const card = e.currentTarget;
      if (!card) return;

      var wrapper = card._dragWrapper || card.closest('[data-id]');
      if (!wrapper) return;

      this.state.isDragging = true;
      this.state.draggedElement = wrapper;
      this.state.startIndex = this.getIndex(wrapper);
      this.state.currentIndex = this.state.startIndex;

      this.createPlaceholder(wrapper);
      var placeholder = this.state.placeholder;
      // Вставляем placeholder на место wrapper и скрываем wrapper (оставляем в DOM для drag)
      if (wrapper.parentNode && placeholder) {
        wrapper.parentNode.insertBefore(placeholder, wrapper);
        wrapper.style.visibility = 'hidden';
        wrapper.style.position = 'absolute';
        wrapper.style.left = '-9999px';
      }

      this.createGhost(wrapper, e);
      document.body.classList.add('dragging-active');

      var container = this.config._container || (typeof this.config.containerSelector === 'string' ? wrapper.closest(this.config.containerSelector) : this.config.containerSelector);
      this.state._container = container;
      if (container) {
        this.state._boundDragOver = this.handleDragOver.bind(this);
        this.state._boundDrop = this.handleDrop.bind(this);
        container.addEventListener('dragover', this.state._boundDragOver);
        container.addEventListener('drop', this.state._boundDrop);
      }
      this.state._boundDragEnd = this.handleDragEnd.bind(this);
      document.addEventListener('dragend', this.state._boundDragEnd);

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', wrapper.getAttribute('data-id') || '');
    },

    handleDragOver: function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      var container = e.currentTarget;
      var draggedItem = this.state.draggedElement;
      var placeholder = this.state.placeholder;
      if (!draggedItem || !placeholder) return;

      var afterElement = this.getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(placeholder);
      } else {
        container.insertBefore(placeholder, afterElement);
      }
    },

    handleDrop: function(e) {
      e.preventDefault();
      var placeholder = this.state.placeholder;
      var draggedItem = this.state.draggedElement;

      if (placeholder && draggedItem && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(draggedItem, placeholder);
        draggedItem.style.visibility = '';
        draggedItem.style.position = '';
        draggedItem.style.left = '';
        this.updateOrder();
      }
    },

    handleDragEnd: function(e) {
      var draggedItem = this.state.draggedElement;
      if (draggedItem) {
        draggedItem.style.visibility = '';
        draggedItem.style.position = '';
        draggedItem.style.left = '';
      }
      this.cleanup();
    },

    getDragAfterElement: function(container, y) {
      // Ищем все wrapper элементы с data-id, исключая placeholder и dragged элемент
      const items = Array.from(container.querySelectorAll('[data-id]:not(.card-placeholder)'))
        .filter(item => item !== this.state.draggedElement);
      
      return items.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    createPlaceholder: function(item) {
      const placeholder = document.createElement('div');
      placeholder.className = 'card card-placeholder';
      placeholder.style.height = item.offsetHeight + 'px';
      placeholder.style.width = item.offsetWidth + 'px';
      this.state.placeholder = placeholder;
      return placeholder;
    },

    createGhost: function(item, e) {
      const rect = item.getBoundingClientRect();
      const ghost = item.cloneNode(true);
      ghost.className = ghost.className + ' drag-ghost';
      ghost.style.position = 'fixed';
      ghost.style.top = rect.top + 'px';
      ghost.style.left = rect.left + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.9';
      ghost.style.transform = 'rotate(2deg)';
      ghost.style.zIndex = '10000';
      document.body.appendChild(ghost);
      this.state.ghost = ghost;

      // Обновляем позицию ghost при движении
      const updateGhost = (moveEvent) => {
        if (this.state.ghost) {
          const offsetX = moveEvent.clientX - rect.left - rect.width / 2;
          const offsetY = moveEvent.clientY - rect.top - rect.height / 2;
          this.state.ghost.style.left = (rect.left + offsetX) + 'px';
          this.state.ghost.style.top = (rect.top + offsetY) + 'px';
        }
      };

      document.addEventListener('dragover', updateGhost);
      this.state.ghostUpdateHandler = updateGhost;
    },

    getIndex: function(element) {
      var container = this.config._container || (typeof this.config.containerSelector === 'string' ? element.closest(this.config.containerSelector) : this.config.containerSelector);
      if (!container) return -1;
      // Ищем все wrapper элементы с data-id, исключая placeholder
      const items = Array.from(container.querySelectorAll('[data-id]:not(.card-placeholder)'));
      return items.indexOf(element);
    },

    updateOrder: function() {
      var container = this.state._container || (this.state.draggedElement && (typeof this.config.containerSelector === 'string' ? this.state.draggedElement.closest(this.config.containerSelector) : this.config._container));
      if (!container || !this.config.onUpdateOrder) return;

      // Ищем все wrapper элементы с data-id, исключая placeholder
      const items = Array.from(container.querySelectorAll('[data-id]:not(.card-placeholder)'));
      const order = items.map(item => {
        const id = item.getAttribute('data-id');
        return id ? parseInt(id, 10) : null;
      }).filter(id => id !== null);

      if (order.length > 0) {
        const orderData = order.map((id, index) => ({ id, sort: index + 1 }));
        this.config.onUpdateOrder(orderData);
      }
    },

    cleanup: function() {
      var container = this.state._container;
      if (container && this.state._boundDragOver) {
        container.removeEventListener('dragover', this.state._boundDragOver);
        container.removeEventListener('drop', this.state._boundDrop);
      }
      this.state._container = null;
      if (this.state._boundDragEnd) {
        document.removeEventListener('dragend', this.state._boundDragEnd);
      }
      this.state._boundDragOver = null;
      this.state._boundDrop = null;
      this.state._boundDragEnd = null;

      if (this.state.placeholder) {
        this.state.placeholder.remove();
        this.state.placeholder = null;
      }

      if (this.state.ghost) {
        this.state.ghost.remove();
        this.state.ghost = null;
      }

      if (this.state.ghostUpdateHandler) {
        document.removeEventListener('dragover', this.state.ghostUpdateHandler);
        this.state.ghostUpdateHandler = null;
      }

      document.body.classList.remove('dragging-active');
      this.state.isDragging = false;
      this.state.draggedElement = null;
      this.state.startIndex = -1;
      this.state.currentIndex = -1;

      if (typeof window !== 'undefined' && window.masonryGrid && window.masonryGrid.resizeAllGridItems) {
        var el = this.config._container || (typeof this.config.containerSelector === 'string' ? document.querySelector(this.config.containerSelector) : this.config.containerSelector);
        if (el) {
          setTimeout(function() { window.masonryGrid.resizeAllGridItems(el); }, 100);
        }
      }
    },
  };

  // Экспорт в глобальную область
  if (typeof window !== 'undefined') {
    window.DragDropGrid = DragDropGrid;
  }
})();
