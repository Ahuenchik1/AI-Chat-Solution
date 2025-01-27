// Добавляем в начало файла
class RasaWebAdapter {
    constructor(rasaEndpoint = 'http://localhost:5005') {
        this.endpoint = rasaEndpoint;
    }

    async sendMessage(message, sessionId) {
        try {
            console.log('Sending message to Rasa:', message);
            const response = await fetch(`${this.endpoint}/webhooks/rest/webhook`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender: sessionId,
                    message: message
                })
            });

            const data = await response.json();
            console.log('Rasa response:', data);

            return {
                text: data[0]?.text || 'Извините, я не получил ответ.',
                quickReplies: this.extractQuickReplies(data[0])
            };
        } catch (error) {
            console.error('Error sending message to Rasa:', error);
            return {
                text: 'Извините, сервис временно недоступен.',
                error: error.message
            };
        }
    }

    extractQuickReplies(response) {
        return response?.buttons?.map(button => button.title) || [];
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Получаем все необходимые элементы
    const chatWidget = document.getElementById('chat-widget');
    const chatToggle = document.getElementById('chat-toggle');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-message');
    const closeButton = document.getElementById('close-chat');
    const toggleInput = chatToggle.querySelector('input');
    const header = document.querySelector('.header-container');

    let lastScrollY = window.scrollY;

    // Обработчик скролла для отображения виджета
    function handleScroll() {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY) {
            header.classList.add('compact');
        } else if (currentScrollY < lastScrollY) {
            header.classList.remove('compact');
        }

        // Показываем виджет после прокрутки
        if (currentScrollY > 100) {
                chatWidget.classList.add('visible');
        } else {
                chatWidget.classList.remove('visible');
            if (chatWidget.classList.contains('active')) {
                chatWidget.classList.remove('active');
                overlay.classList.remove('active');
                updatePlaceholders(true);
            }
        }

        lastScrollY = currentScrollY;
    }

    // Используем debounce для плавной работы
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) {
            window.cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = window.requestAnimationFrame(handleScroll);
    });

    const rasaAdapter = new RasaWebAdapter('http://localhost:5005');
    const sessionId = 'web_' + Math.random().toString(36).substr(2, 9);

    // Функция управления плейсхолдерами
    function updatePlaceholders(isClosing = false) {
        const widgetInput = document.querySelector('#chat-toggle input');
        const chatInput = document.querySelector('.chat-input input');

        if (isClosing) {
            // При закрытии чата
            if (widgetInput) {
                widgetInput.placeholder = '💬 Спросите нашего AI-ассистента...';
            }
            if (chatInput) {
                chatInput.placeholder = 'Введите сообщение...';
            }
        } else {
            // При открытии чата
            if (widgetInput) {
                widgetInput.placeholder = '';
            }
            if (chatInput) {
                chatInput.placeholder = '💬 Спросите нашего AI-ассистента...';
            }
        }
    }

    function addMessage(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleMessageSend() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage('user', message);
        userInput.value = '';

        // При отправке сообщения убираем плейсхолдер из чата
        const chatInput = document.querySelector('.chat-input input');
        if (chatInput) {
            chatInput.placeholder = '';
        }

        try {
            const response = await rasaAdapter.sendMessage(message, sessionId);
            addMessage('bot', response.text);

            if (response.quickReplies?.length > 0) {
                addQuickReplies(response.quickReplies);
            }
        } catch (error) {
            console.error('Chat error:', error);
            addMessage('bot', 'Извините, произошла ошибка. Попробуйте позже.');
        }
    }

    // Обработчики событий
    sendButton.addEventListener('click', handleMessageSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleMessageSend();
    });

    // Открытие чата
    chatToggle.addEventListener('click', () => {
        chatWidget.classList.add('active');
        overlay.classList.add('active'); // Добавляем затемнение
        userInput.focus();
        updatePlaceholders(false);
    });

    // Закрытие чата
    closeButton.addEventListener('click', () => {
        chatWidget.classList.remove('active');
        overlay.classList.remove('active'); // Убираем затемнение
        updatePlaceholders(true);
    });

    // Инициализация плейсхолдеров при загрузке
    updatePlaceholders(true);

    // Функция добавления индикатора загрузки
    function addLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot loading';
        loadingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return loadingDiv;
    }

    // Функция добавления быстрых ответов
    function addQuickReplies(replies) {
        const quickRepliesContainer = document.createElement('div');
        quickRepliesContainer.className = 'quick-replies';

        replies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-button';
            button.textContent = reply;
            button.onclick = () => {
                userInput.value = reply;
                handleMessageSend();
            };
            quickRepliesContainer.appendChild(button);
        });

        chatMessages.appendChild(quickRepliesContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Функция добавления кнопки повтора
    function addRetryButton(message) {
        const retryButton = document.createElement('button');
        retryButton.className = 'retry-button';
        retryButton.textContent = 'Попробовать снова';
        retryButton.onclick = () => {
            retryButton.remove();
            userInput.value = message;
            handleMessageSend();
        };
        chatMessages.appendChild(retryButton);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Предотвращение закрытия чата при клике внутри него
    chatWidget.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Обновляем обработчик клика вне чата
    document.addEventListener('click', function(e) {
        if (!chatWidget.contains(e.target)) {
            chatWidget.classList.remove('active');
            overlay.classList.remove('active');
            updatePlaceholders(true);
        }
    });

    // Получаем элементы
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const overlay = document.querySelector('.overlay');

    // Обработчик клика на кнопку меню
    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        menuToggle.classList.toggle('active'); // Добавляем класс для анимации
        navLinks.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    // Закрываем меню при клике вне его области
    document.addEventListener('click', function(e) {
        if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
            menuToggle.classList.remove('active'); // Убираем класс для анимации
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
        }
    });

    // Закрываем меню при клике на ссылку
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active'); // Убираем класс для анимации
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
        });
    });

    // Функция для анимации чисел
    function animateNumber(element, start, end, duration) {
        let current1 = start;
        let current2 = start;
        const originalText = element.textContent;
        const hasPercent = originalText.includes('%');
        const hasSlash = originalText.includes('/');
        const prefix = originalText.startsWith('+') ? '+' : '';
        const isNegative = originalText.startsWith('-');
        
        // Определяем конечные значения
        const endValue1 = hasSlash ? 24 : end;
        const endValue2 = 7;
        
        const range = Math.abs(endValue1 - start);
        const stepTime = Math.abs(Math.floor(duration / range));
        
        const timer = setInterval(() => {
            if (hasSlash) {
                if (current1 !== endValue1) current1 += current1 < endValue1 ? 1 : -1;
                if (current2 !== endValue2) current2 += current2 < endValue2 ? 1 : -1;
            } else {
                current1 += current1 < endValue1 ? 1 : -1;
            }
            
            // Форматируем число в зависимости от типа
            let formattedNumber;
            if (hasSlash) {
                formattedNumber = `${current1}/${current2}`;
            } else if (hasPercent) {
                formattedNumber = isNegative ? `-${Math.abs(current1)}%` : `${prefix}${current1}%`;
            } else {
                formattedNumber = isNegative ? `-${Math.abs(current1)}` : `${prefix}${current1}`;
            }
            
            element.textContent = formattedNumber;
            
            // Проверяем условие остановки
            if (hasSlash) {
                if (current1 === endValue1 && current2 === endValue2) {
                    clearInterval(timer);
                }
            } else {
                if (current1 === endValue1) {
                    clearInterval(timer);
                }
            }
        }, stepTime);
    }

    // Функция для запуска анимации
    function handleIntersection(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(number => {
                    if (!number.classList.contains('animated')) {
                        const originalText = number.textContent;
                        const hasPercent = originalText.includes('%');
                        const hasSlash = originalText.includes('/');
                        const prefix = originalText.startsWith('+') ? '+' : '';
                        const isNegative = originalText.startsWith('-');
                        const endValue = hasSlash ? 24 : parseInt(originalText.replace(/[^0-9-]/g, ''));
                        
                        // Устанавливаем начальное значение
                        let initialValue;
                        if (hasSlash) {
                            initialValue = '0/0';
                        } else if (hasPercent) {
                            initialValue = isNegative ? '-0%' : `${prefix}0%`;
                        } else {
                            initialValue = isNegative ? '-0' : `${prefix}0`;
                        }
                        
                        number.textContent = initialValue;
                        animateNumber(number, 0, endValue, 2000);
                        number.classList.add('animated');
                    }
                });
                observer.unobserve(entry.target);
            }
        });
    }

    // Создаем наблюдатель за появлением элементов
    const observer = new IntersectionObserver(handleIntersection, {
        threshold: 0.1
    });

    // Находим контейнер со статистикой и начинаем наблюдение
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        observer.observe(statsGrid);
    }

    // Функция для анимации этапов
    function animateTimeline() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2
        });

        timelineItems.forEach(item => {
            observer.observe(item);
        });
    }

    // Запускаем анимацию после загрузки страницы
    animateTimeline();

    // Добавляем JavaScript для обработки переворота
    const cards = document.querySelectorAll('.pricing-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Проверяем, что клик не был на кнопке
            if (!e.target.closest('.pricing-button')) {
                this.classList.toggle('flipped');
            }
        });
    });

    document.querySelectorAll('.info-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tooltip = e.target.closest('.pricing-card').querySelector('.limitations-tooltip');
            tooltip.classList.add('active');
        });
    });

    document.querySelectorAll('.close-tooltip').forEach(button => {
        button.addEventListener('click', (e) => {
            const tooltip = e.target.closest('.limitations-tooltip');
            tooltip.classList.remove('active');
        });
    });

    // Переключение между телефоном и email
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активный класс у всех табов
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            // Активируем текущий таб
            tab.classList.add('active');

            // Скрываем все поля
            document.querySelectorAll('.contact-field').forEach(field => field.classList.remove('active'));
            // Показываем нужное поле
            document.querySelector(`.${tab.dataset.type}-field`).classList.add('active');
        });
    });

    // Маска для телефона
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            value = '+7 (' + value.substring(1, 4) 
                + (value.length > 4 ? ') ' + value.substring(4, 7) : '')
                + (value.length > 7 ? '-' + value.substring(7, 9) : '')
                + (value.length > 9 ? '-' + value.substring(9, 11) : '');
        }
        e.target.value = value;
    });

    // Функция для отправки данных в Telegram
    async function sendToTelegram(data) {
        const BOT_TOKEN = '7564033002:AAEhfgyF5qBCAdcadg0XD33cRJUmmh3yH5Y'; 
        const CHAT_ID = '1035484885'; 
        
        let message = '🔥 Новая заявка!\n\n';
        
        if (data.type === 'contact') {
            message += `👤 Имя: ${data.name}\n`;
            message += data.phone ? `📱 Телефон: ${data.phone}\n` : '';
            message += data.email ? `📧 Email: ${data.email}\n` : '';
            message += data.messenger ? `💬 Мессенджер: ${data.messenger}\n` : '';
        } else if (data.type === 'tariff') {
            message += `📦 Выбранный тариф: ${data.tariff}\n`;
            message += `👤 Имя: ${data.name}\n`;
            message += data.phone ? `📱 Телефон: ${data.phone}\n` : '';
            message += data.email ? `📧 Email: ${data.email}\n` : '';
            message += data.messenger ? `💬 Мессенджер: ${data.messenger}\n` : '';
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка отправки в Telegram');
            }

            return true;
        } catch (error) {
            console.error('Ошибка:', error);
            return false;
        }
    }

    // Обработчик отправки контактной формы
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            type: 'contact',
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            messenger: formData.get('messenger')
        };

        // Показываем индикатор загрузки
        const submitButton = e.target.querySelector('.submit-button');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Отправка...';
        submitButton.disabled = true;

        const success = await sendToTelegram(data);

        if (success) {
            alert('Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.');
            e.target.reset();
        } else {
            alert('Произошла ошибка при отправке. Пожалуйста, попробуйте позже или свяжитесь с нами другим способом.');
        }

        // Возвращаем кнопку в исходное состояние
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    });

    // Обработчик кнопок выбора тарифа
    document.querySelectorAll('.pricing-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const tariffCard = e.target.closest('.pricing-card');
            const tariffName = tariffCard.querySelector('h3').textContent;

            // Создаем модальное окно для сбора контактных данных
            const modal = document.createElement('div');
            modal.className = 'tariff-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Оформление тарифа ${tariffName}</h3>
                    <form id="tariffForm">
                        <input type="text" name="name" placeholder="Ваше имя" required>
                        <input type="tel" name="phone" placeholder="+7 (___) ___-__-__">
                        <input type="email" name="email" placeholder="Email">
                        <div class="messenger-select">
                            <p>Выберите удобный мессенджер:</p>
                            <div class="messenger-list">
                                <label class="messenger-item">
                                    <input type="radio" name="messenger" value="telegram">
                                    <span class="messenger-box">
                                        <i class="fab fa-telegram"></i>
                                        <span>Telegram</span>
                                    </span>
                                </label>
                                <label class="messenger-item">
                                    <input type="radio" name="messenger" value="whatsapp">
                                    <span class="messenger-box">
                                        <i class="fab fa-whatsapp"></i>
                                        <span>WhatsApp</span>
                                    </span>
                                </label>
                                <label class="messenger-item">
                                    <input type="radio" name="messenger" value="viber">
                                    <span class="messenger-box">
                                        <i class="fab fa-viber"></i>
                                        <span>Viber</span>
                                    </span>
                                </label>
                            </div>
                        </div>
                        <button type="submit" class="submit-button">Отправить заявку</button>
                    </form>
                    <button class="close-modal">×</button>
                </div>
            `;

            document.body.appendChild(modal);

            // Добавляем стили для модального окна
            const style = document.createElement('style');
            style.textContent = `
                .tariff-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    padding: 2rem;
                    border-radius: 1rem;
                    position: relative;
                    max-width: 400px;
                    width: 90%;
                }
                .close-modal {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    border: none;
                    background: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                #tariffForm {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                #tariffForm input {
                    padding: 0.8rem;
                    border: 1px solid #ddd;
                    border-radius: 0.5rem;
                }
                .messenger-select {
                    margin-top: 1rem;
                }
                .messenger-select p {
                    margin-bottom: 0.8rem;
                    color: #666;
                    font-size: 0.9rem;
                }
                .messenger-list {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                .messenger-item {
                    cursor: pointer;
                }
                .messenger-item input {
                    display: none;
                }
                .messenger-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0.6rem;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 0.5rem;
                    width: 60px;
                    transition: all 0.3s ease;
                }
                .messenger-box i {
                    font-size: 1.1rem;
                    margin-bottom: 0.2rem;
                }
                .messenger-box span {
                    font-size: 0.7rem;
                    white-space: nowrap;
                }
                .messenger-item input:checked + .messenger-box {
                    background: var(--primary-color);
                    color: white;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(45, 59, 240, 0.2);
                }
            `;
            document.head.appendChild(style);

            // Обработчик отправки формы тарифа
            document.getElementById('tariffForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = {
                    type: 'tariff',
                    tariff: tariffName,
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    email: formData.get('email'),
                    messenger: formData.get('messenger')
                };

                const submitButton = e.target.querySelector('.submit-button');
                submitButton.textContent = 'Отправка...';
                submitButton.disabled = true;

                const success = await sendToTelegram(data);

                if (success) {
                    alert('Спасибо! Ваша заявка на тариф отправлена. Мы свяжемся с вами в ближайшее время.');
                    modal.remove();
                } else {
                    alert('Произошла ошибка при отправке. Пожалуйста, попробуйте позже или свяжитесь с нами другим способом.');
                    submitButton.textContent = 'Отправить заявку';
                    submitButton.disabled = false;
                }
            });

            // Закрытие модального окна
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.remove();
            });
            
            // Закрытие по клику вне модального окна
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        });
    });

    // Плавная прокрутка к якорям
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                // Закрываем мобильное меню при клике на ссылку
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                overlay.classList.remove('active');
                
                // Плавная прокрутка
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Показываем виджет сразу, если страница загружена с прокруткой
    if (window.scrollY > 100) {
        chatWidget.classList.add('visible');
    }
}); 