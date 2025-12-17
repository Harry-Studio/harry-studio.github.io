// Global state variables
// Default language is auto-detected from the browser (non-zh -> 'en').
let currentLang = 'zh';
let poems = {};
let config = {};

// 應用程序主對象
const App = {
    // 數據管理器
    DataManager: {
        async loadData() {
            // 使用預加載的 window.SITE_DATA (data.js)；不再嘗試 fetch data.json
            if (window.SITE_DATA) {
                poems = window.SITE_DATA.poems || { zh: [], en: [] };
                config = window.SITE_DATA.config || { zh: {}, en: {} };
                return window.SITE_DATA;
            }
            console.warn('window.SITE_DATA 未定義，使用空數據 (請確認 data.js 是否正確引入)。');
            poems = { zh: [], en: [] };
            config = { zh: {}, en: {} };
            return { poems, config };
        }
    },

    // 語言管理器
    LanguageManager: {
    // Switch language: any non-'zh' is treated as 'en' (default now English)
        changeLanguage(lang) {
            // 歸一化: 不是 'zh' 就強制 'en'
            const normalized = (lang === 'zh') ? 'zh' : 'en';

            // 如果沒有變化則直接返回 / No-op if already current
            if (normalized === currentLang) {
                console.log('[Language] No change, still:', currentLang);
                return;
            }

            console.log('[Language] Changing from', currentLang, 'to', normalized, ' (input =', lang, ')');
            currentLang = normalized;

            // 更新頁面內容 / Update page content
            this.updateContent();

            // 更新語言按鈕 / Update toggle button
            this.updateLanguageButton();

            // 保持索引刷新詩詞 / Re-display poem at current index
            App.PoemManager.displayCurrentPoem();

            console.log('[Language] Changed successfully to:', currentLang);
        },

        // 更新頁面內容
        updateContent() {
            if (!config[currentLang]) {
                console.warn('Config not found for language:', currentLang);
                return;
            }

            const langConfig = config[currentLang];
            
            // 更新標題
            const titleElement = document.querySelector('#message h1');
            if (titleElement && langConfig.title) {
                titleElement.textContent = langConfig.title;
            }
            // 同步瀏覽器頁面標題（<title>）
            if (langConfig.title) {
                document.title = langConfig.title;
            }
            
            // 更新問候語（時間問候語 + 歡迎語）
            App.Utils.updateGreeting();

            // 更新導航鏈接文字
            this.updateNavigationText(langConfig);
        },

        // 更新導航文字
        updateNavigationText(langConfig) {
            if (!langConfig.navigation) return;

            const blogLink = document.querySelector('.go2blogwork a[href*="blog"]');
            const workLink = document.querySelector('.go2blogwork a[href*="work"]');

            if (blogLink && langConfig.navigation.blog) {
                blogLink.textContent = langConfig.navigation.blog;
            }
            if (workLink && langConfig.navigation.work) {
                workLink.textContent = langConfig.navigation.work;
            }
        },

        // 更新語言切換按鈕
        updateLanguageButton() {
            const languageSwitcher = document.querySelector('.language-switcher');
            if (!languageSwitcher) {
                console.error('Language switcher container not found');
                return;
            }
            // 查找是否已有按鈕, 有則複用; 沒有才創建
            // 如果由於舊版本腳本造成多個, 先強制清理保留第一個
            const multiples = languageSwitcher.querySelectorAll('.language-button');
            if (multiples.length > 1) {
                multiples.forEach((btn, idx) => { if (idx > 0) btn.remove(); });
            }
            let langButton = languageSwitcher.querySelector('#lang-toggle-btn') || languageSwitcher.querySelector('.language-button');
            if (!langButton) {
                langButton = document.createElement('a');
                langButton.href = '#';
                langButton.id = 'lang-toggle-btn';
                langButton.className = 'language-button';
                languageSwitcher.appendChild(langButton);
                // 移除除當前新建按鈕外的所有舊 language-button
                languageSwitcher.querySelectorAll('.language-button').forEach(btn => {
                    if (btn !== langButton) btn.remove();
                });
                langButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetLang = langButton.dataset.targetLang;
                    this.changeLanguage(targetLang);
                }, { passive: false });
            } else {
                // 確保只有一個監聽（移除可能重複的舊監聽，通過克隆方法）
                const clone = langButton.cloneNode(true);
                langButton.replaceWith(clone);
                langButton = clone;
                langButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const targetLang = langButton.dataset.targetLang;
                    this.changeLanguage(targetLang);
                }, { passive: false });
            }
            
            // 設置按鈕內容和點擊事件
            if (currentLang === 'zh') {
                // 當前是中文，顯示English按鈕
                langButton.innerHTML = '🌐English';
                langButton.dataset.targetLang = 'en';
            } else {
                // 當前是英文，顯示中文按鈕
                langButton.innerHTML = '繁體';
                langButton.dataset.targetLang = 'zh';
            }

            // 只更新文字和 data-targetLang
            
            console.log('Language button updated for lang:', currentLang);
        }
    },

    // 詩詞管理器
    PoemManager: {
        currentIndex: 0,

        // 顯示當前索引的詩詞（用於語言切換時保持位置）
        displayCurrentPoem() {
            if (!poems[currentLang] || poems[currentLang].length === 0) {
                console.warn('No poems available for language:', currentLang);
                // 如果當前語言沒有詩詞，嘗試顯示默認語言的詩詞
                const fallbackLang = currentLang === 'zh' ? 'en' : 'zh';
                if (poems[fallbackLang] && poems[fallbackLang].length > 0) {
                    const poemList = poems[fallbackLang];
                    this.currentIndex = Math.min(this.currentIndex, poemList.length - 1);
                    this.displayPoem(poemList[this.currentIndex]);
                }
                return;
            }

            const poemList = poems[currentLang];
            // 確保索引在有效範圍內
            if (this.currentIndex >= poemList.length) {
                this.currentIndex = 0;
            }
            
            console.log('Displaying poem for language:', currentLang, 'index:', this.currentIndex);
            this.displayPoem(poemList[this.currentIndex]);
        },

        // 顯示隨機詩詞
        showRandomPoem() {
            if (!poems[currentLang] || poems[currentLang].length === 0) {
                console.warn('No poems available for language:', currentLang);
                return;
            }

            const poemList = poems[currentLang];
            this.currentIndex = Math.floor(Math.random() * poemList.length);
            this.displayPoem(poemList[this.currentIndex]);
        },

        // 顯示下一首詩詞
        showNextPoem() {
            if (!poems[currentLang] || poems[currentLang].length === 0) {
                return;
            }

            const poemList = poems[currentLang];
            this.currentIndex = (this.currentIndex + 1) % poemList.length;
            this.displayPoem(poemList[this.currentIndex]);
        },

        // 顯示上一首詩詞
        showPrevPoem() {
            if (!poems[currentLang] || poems[currentLang].length === 0) {
                return;
            }

            const poemList = poems[currentLang];
            this.currentIndex = (this.currentIndex - 1 + poemList.length) % poemList.length;
            this.displayPoem(poemList[this.currentIndex]);
        },

        // 顯示詩詞內容
        displayPoem(poem) {
            if (!poem) return;

            const container = document.querySelector('.main-shici');
            if (!container) return;

            // 清空現有內容
            container.innerHTML = '';

            // 創建詩詞標題
            if (poem.title || poem.author) {
                const titleP = document.createElement('p');
                titleP.style.fontWeight = 'bold';
                titleP.style.fontSize = '20px';
                titleP.style.marginBottom = '15px';
                titleP.style.color = '#2c3e50';
                
                let titleText = '';
                if (poem.title) titleText += poem.title;
                if (poem.author) titleText += (titleText ? ' - ' : '') + poem.author;
                titleP.textContent = titleText;
                
                container.appendChild(titleP);
            }

            // 分隔線
            const hr = document.createElement('hr');
            container.appendChild(hr);

            // 創建詩詞內容區域
            const article = document.createElement('div');
            article.className = 'article chushibiao';
            article.style.display = 'block';

            // 添加詩詞內容
            const poemContent = poem.content || poem.item;
            if (poemContent) {
                const lines = Array.isArray(poemContent) ? poemContent : poemContent.split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        const p = document.createElement('p');
                        p.textContent = line.trim();
                        article.appendChild(p);
                    }
                });
            }

            container.appendChild(article);

            // 添加導航按鈕
            this.addNavigationButtons(container);
        },

        // 添加導航按鈕
        addNavigationButtons(container) {
            const navDiv = document.createElement('div');
            navDiv.style.textAlign = 'center';
            navDiv.style.marginTop = '10px';
            navDiv.style.padding = '8px';

            const prevBtn = document.createElement('button');
            prevBtn.textContent = currentLang === 'zh' ? '上一篇' : 'Previous';
            prevBtn.onclick = () => this.showPrevPoem();
            this.styleButton(prevBtn);

            const nextBtn = document.createElement('button');
            nextBtn.textContent = currentLang === 'zh' ? '下一篇' : 'Next';
            nextBtn.onclick = () => this.showNextPoem();
            this.styleButton(nextBtn);

            const randomBtn = document.createElement('button');
            randomBtn.textContent = currentLang === 'zh' ? '隨機' : 'Random';
            randomBtn.onclick = () => this.showRandomPoem();
            this.styleButton(randomBtn);

            navDiv.appendChild(prevBtn);
            navDiv.appendChild(randomBtn);
            navDiv.appendChild(nextBtn);
            container.appendChild(navDiv);
        },

        // 按鈕樣式
        styleButton(button) {
            button.style.cssText = `
                margin: 0 5px;
                padding: 6px 12px;
                background: linear-gradient(45deg, #689f38, #4a7c3a);
                color: white;
                border: none;
                border-radius: 15px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(104, 159, 56, 0.4);
            `;

            button.onmouseover = function() {
                this.style.background = 'linear-gradient(45deg, #5d8a2f, #3e5e2a)';
                this.style.boxShadow = '0 6px 20px rgba(104, 159, 56, 0.6)';
                this.style.transform = 'translateY(-2px)';
            };

            button.onmouseout = function() {
                this.style.background = 'linear-gradient(45deg, #689f38, #4a7c3a)';
                this.style.boxShadow = '0 4px 15px rgba(104, 159, 56, 0.4)';
                this.style.transform = 'translateY(0)';
            };
        }
    },

    // 工具函數
    Utils: {
        // 獲取當前時間問候語
        getTimeGreeting() {
            const hour = new Date().getHours();
            const greetings = config[currentLang]?.greetings;
            
            if (!greetings) return '';

            if (hour >= 5 && hour < 12) {
                return greetings.morning || '';
            } else if (hour >= 12 && hour < 18) {
                return greetings.afternoon || '';
            } else {
                return greetings.evening || '';
            }
        },

        // 更新問候語
        updateGreeting() {
            const timeGreeting = this.getTimeGreeting();
            const welcomeConfig = config[currentLang]?.welcome || '';
            const welcomeElement = document.getElementById('welcome');
            
            if (welcomeElement) {
                // 組合時間問候語和配置中的歡迎語
                let combinedGreeting = '';
                if (timeGreeting && welcomeConfig) {
                    combinedGreeting = `${timeGreeting} ${welcomeConfig}`;
                } else if (timeGreeting) {
                    combinedGreeting = timeGreeting;
                } else if (welcomeConfig) {
                    combinedGreeting = welcomeConfig;
                }
                
                welcomeElement.textContent = combinedGreeting;
            }
        },

        // 更新當前年份
        updateCurrentYear() {
            const currentYear = new Date().getFullYear();
            const copyrightElement = document.querySelector('.icp p');
            if (copyrightElement) {
                copyrightElement.textContent = `© ${currentYear} Harry's Work. All rights reserved.`;
            }
        }
    },

    // 初始化應用
    async init() {
        try {
            console.log('Starting app initialization...');
            
            // 加載數據
            await this.DataManager.loadData();
            console.log('Data loaded:', { poems: Object.keys(poems), config: Object.keys(config) });
            
            // 根據瀏覽器語言自動設置語言（不是中文一律英文）
            const browserLang = ((navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language) || '').toLowerCase();
            const initialLang = browserLang.startsWith('zh') ? 'zh' : 'en';
            this.LanguageManager.changeLanguage(initialLang);
            // 顯示隨機詩詞
            this.PoemManager.showRandomPoem();
            
            // 更新問候語
            this.Utils.updateGreeting();
            
            // 更新年份
            this.Utils.updateCurrentYear();
            
            // 驗證語言切換器是否存在
            const languageSwitcher = document.querySelector('.language-switcher');
            if (languageSwitcher) {
                console.log('Language switcher found:', languageSwitcher);
                console.log('Current buttons:', languageSwitcher.querySelectorAll('a'));
            } else {
                console.error('Language switcher not found!');
            }
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
        }
    }
};

// 全局函數，供HTML調用 (已不再需要，但保留以防萬一)
function changeLanguage(lang) {
    App.LanguageManager.changeLanguage(lang);
    App.PoemManager.showRandomPoem();
    App.Utils.updateGreeting();
}

// DOM加載完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});

// 頁面加載完成後的額外處理
window.addEventListener('load', function() {
    // 如果有需要的話，可以在這裡添加額外的初始化邏輯
    console.log('Page fully loaded');
});
