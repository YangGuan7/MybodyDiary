// ==========================================================================
// LifeFlow 核心前端互動邏輯 (app.js)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // 1. 初始化狀態設定 (預設選擇今天 2026-05-29)
    let currentSelectedDate = new Date('2026-05-29');

    // 模擬從資料庫（Supabase）撈出來的當天初始化數據
    let todayData = {
        waterRecords: [
            { id: 1, time: '09:15', amount: 250 },
            { id: 2, time: '12:30', amount: 500 }
        ],
        maxWater: 3000,
        poopStatus: 'smooth',
        weight: 62.0,
        waist: 72.0
    };

    // ==========================================================================
    // 2. 取得所有需要的 DOM 節點
    // ==========================================================================

    // 彈窗控制節點
    const modal = document.getElementById('record-modal');
    const btnOpenLog = document.getElementById('btn-open-log');
    const btnCloseLog = document.getElementById('btn-close-log');
    const modalDateTitle = document.getElementById('modal-date-title');

    // 週曆控制節點
    const weekRangeTitle = document.querySelector('.current-month-year');
    const calendarWeekContainer = document.querySelector('.calendar-week');
    const btnPrevWeek = document.getElementById('btn-prev-week');
    const btnNextWeek = document.getElementById('btn-next-week');

    // 主頁數據展示與喝水控制節點 (修正：移除重複宣告，統一整理在這裡)
    const overviewWater = document.getElementById('overview-water');
    const overviewWaterBar = document.getElementById('overview-water-bar');
    const mainWaterActions = document.querySelector('.main-water-actions');
    const overviewWeight = document.getElementById('overview-weight');
    const overviewPoop = document.getElementById('overview-poop');
    const waterRecordsList = document.getElementById('water-records-list');

    // 彈窗內表單輸入節點
    const inputWeight = document.getElementById('weight');
    const inputWaist = document.getElementById('waist');
    const btnSaveMetrics = document.querySelector('.btn-save-metrics');
    const btnSaveMeals = document.querySelector('.btn-save-meals');
    const poopOptions = document.querySelector('.poop-options');


    // ==========================================================================
    // 3. 彈窗控制邏輯 (Modal Overlay Toggle)
    // ==========================================================================
    function openModal() {
        // 將目前選中的日期格式化後塞入彈窗標題
        modalDateTitle.textContent = formatDateString(currentSelectedDate);

        // 將主頁目前的數據同步塞入彈窗表單中，方便修改
        inputWeight.value = todayData.weight || '';
        inputWaist.value = todayData.waist || '';

        // 確保彈窗內的排便按鈕 active 狀態與資料同步
        document.querySelectorAll('.btn-poop').forEach(btn => {
            if (btn.dataset.status === todayData.poopStatus) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        modal.classList.add('open');
    }

    function closeModal() {
        modal.classList.remove('open');
    }

    if (btnOpenLog) btnOpenLog.addEventListener('click', openModal);
    if (btnCloseLog) btnCloseLog.addEventListener('click', closeModal);

    // 點擊彈窗暗色遮罩區也可以直接關閉
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }


    // ==========================================================================
    // 4. 主頁「飲水追蹤」即時互動 (時間序列與單獨刪除)
    // ==========================================================================
    function updateWaterUI() {
        // 1. 計算目前的喝水總量 (用 Array.reduce 默默加總)
        const totalIntake = todayData.waterRecords.reduce((sum, record) => sum + record.amount, 0);
        const percent = Math.min((totalIntake / todayData.maxWater) * 100, 100);

        // 2. 更新主頁頂部數字與進度條
        if (overviewWater) overviewWater.textContent = totalIntake;
        if (overviewWaterBar) overviewWaterBar.style.width = `${percent}%`;

        // 3. 動態渲染序列清單
        if (waterRecordsList) {
            waterRecordsList.innerHTML = ''; // 先清空舊畫面

            if (todayData.waterRecords.length === 0) {
                waterRecordsList.innerHTML = `<li style="color:var(--text-muted); font-size:12px; text-align:center; padding:8px;">目前還沒有喝水紀錄喔！</li>`;
                return;
            }

            // 依序將陣列內容轉化成 HTML 節點，並加上 1. 2. 3. 序號
            todayData.waterRecords.forEach((record, index) => {
                const li = document.createElement('li');
                li.className = 'water-log-item';
                li.innerHTML = `
                    <div class="water-item-info">
                        <span class="water-item-index">${index + 1}.</span>
                        <span class="water-item-time">[${record.time}]</span>
                        <span class="water-item-amount">${record.amount} ml</span>
                    </div>
                    <button class="btn-delete-water" data-id="${record.id}" aria-label="刪除此紀錄">&times;</button>
                `;
                waterRecordsList.appendChild(li);
            });
        }
    }

    // 新增喝水紀錄 (自動抓取當前系統時間)
    if (mainWaterActions) {
        mainWaterActions.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-water') && !e.target.classList.contains('btn-water-reset')) return;

            if (e.target.classList.contains('btn-water')) {
                const amount = parseInt(e.target.dataset.amount);

                // 🕒 自動取得當前精確時間 (HH:MM)
                const now = new Date();
                const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                // 推入陣列
                todayData.waterRecords.push({
                    id: Date.now(), // 用時間戳記當作唯一的 ID 方便後續過濾刪除
                    time: currentTimeStr,
                    amount: amount
                });

            } else if (e.target.classList.contains('btn-water-reset')) {
                todayData.waterRecords = []; // 清空陣列
            }

            updateWaterUI();
        });
    }

    // 🔴 單獨刪除某一筆紀錄 (利用事件代理監聽叉叉按鈕)
    if (waterRecordsList) {
        waterRecordsList.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn-delete-water')) return;

            const recordId = parseInt(e.target.dataset.id);

            // 透過 Array.filter 過濾掉該 ID，達成刪除效果
            todayData.waterRecords = todayData.waterRecords.filter(record => record.id !== recordId);

            // 重新渲染畫面
            updateWaterUI();
            console.log(`已刪除紀錄 ID: ${recordId}`);
        });
    }


    // ==========================================================================
    // 5. 彈窗表單數據處理（排便單選、體態、飲食儲存）
    // ==========================================================================

    // 排便按鈕單選控制 (事件代理)
    if (poopOptions) {
        poopOptions.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.btn-poop');
            if (!targetBtn) return;

            document.querySelectorAll('.btn-poop').forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');

            // 變更內部暫存狀態
            todayData.poopStatus = targetBtn.dataset.status;
        });
    }

    // 更新主頁便便狀況 Badge 的外觀顯示
    function updatePoopOverviewUI() {
        if (!overviewPoop) return;

        // 先移除舊的所有顏色類別
        overviewPoop.className = 'poop-badge';

        // 根據最新狀態賦予對應的語系與色塊樣式
        switch (todayData.poopStatus) {
            case 'smooth':
                overviewPoop.classList.add('smooth');
                overviewPoop.innerHTML = `<span class="badge-emoji">✨</span> 順暢清爽`;
                break;
            case 'constipated':
                overviewPoop.classList.add('constipated');
                overviewPoop.innerHTML = `<span class="badge-emoji">🧱</span> 便秘卡關`;
                break;
            case 'diarrhea':
                overviewPoop.classList.add('diarrhea');
                overviewPoop.innerHTML = `<span class="badge-emoji">🌊</span> 拉肚肚子`;
                break;
            case 'none':
                overviewPoop.classList.add('none');
                overviewPoop.innerHTML = `<span class="badge-emoji">❌</span> 今天沒上`;
                break;
        }
    }

    // 儲存今日體態
    if (btnSaveMetrics) {
        btnSaveMetrics.addEventListener('click', () => {
            todayData.weight = parseFloat(inputWeight.value) || 0;
            todayData.waist = parseFloat(inputWaist.value) || 0;

            // 更新主頁體重數字
            if (overviewWeight) overviewWeight.textContent = todayData.weight.toFixed(1);

            alert(`體態已暫存！體重: ${todayData.weight}kg / 腰圍: ${todayData.waist}cm`);
        });
    }

    // 儲存今日飲食與帳目
    if (btnSaveMeals) {
        btnSaveMeals.addEventListener('click', () => {
            const mealsData = [];

            // 迴圈撈取各餐的 DOM 輸入值
            document.querySelectorAll('.meal-row').forEach(row => {
                const mealType = row.dataset.meal;
                const foodItems = row.querySelector('.input-food').value;
                const cost = parseInt(row.querySelector('.input-cost').value) || 0;
                const rating = row.querySelector('.select-rating').value;

                mealsData.push({ mealType, foodItems, cost, rating });
            });

            console.log('收集到的今日飲食帳目總表：', mealsData);

            // 同步更新主頁便便動態
            updatePoopOverviewUI();

            alert(`今日飲食與帳目（共 ${mealsData.length} 筆）已成功儲存！`);
            closeModal();
        });
    }


    // ==========================================================================
    // 6. 硬核核心：動態橫式周曆演算法 (Weekly Calendar Grid)
    // ==========================================================================

    // 計算該日期的當週星期一
    function getMonday(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    // 格式化 Date 物件為標準 YYYY-MM-DD
    function formatDateString(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // 動態生成與渲染週曆
    function renderWeekCalendar(baseDate) {
        if (!calendarWeekContainer) return;

        calendarWeekContainer.innerHTML = '';
        const monday = getMonday(baseDate);
        const dayNames = ['一', '二', '三', '四', '五', '六', '日'];

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startMM = String(monday.getMonth() + 1).padStart(2, '0');
        const startDD = String(monday.getDate()).padStart(2, '0');
        const endMM = String(sunday.getMonth() + 1).padStart(2, '0');
        const endDD = String(sunday.getDate()).padStart(2, '0');
        weekRangeTitle.textContent = `${monday.getFullYear()} 年 ${startMM}月${startDD}日 - ${endMM}月${endDD}日`;

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + i);

            const dateStr = formatDateString(currentDay);
            const isToday = dateStr === '2026-05-29';
            const isActive = dateStr === formatDateString(currentSelectedDate);

            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day ${isToday ? 'today' : ''} ${isActive ? 'active' : ''}`;
            dayElement.dataset.date = dateStr;

            dayElement.innerHTML = `
                <span class="day-name">${dayNames[i]}</span>
                <span class="day-num">${currentDay.getDate()}</span>
                ${isToday ? '<span class="dot-indicator"></span>' : ''}
            `;

            calendarWeekContainer.appendChild(dayElement);
        }
    }

    // 週曆點擊切換日期事件 (事件代理)
    if (calendarWeekContainer) {
        calendarWeekContainer.addEventListener('click', (e) => {
            const targetDay = e.target.closest('.calendar-day');
            if (!targetDay) return;

            currentSelectedDate = new Date(targetDay.dataset.date);
            renderWeekCalendar(currentSelectedDate);

            console.log(`[系統連動] 成功切換視角至：${targetDay.dataset.date}，準備呼叫後端刷新表單。`);
        });
    }

    // 上一週按鈕
    if (btnPrevWeek) {
        btnPrevWeek.addEventListener('click', () => {
            currentSelectedDate.setDate(currentSelectedDate.getDate() - 7);
            renderWeekCalendar(currentSelectedDate);
        });
    }

    // 下一週按鈕
    if (btnNextWeek) {
        btnNextWeek.addEventListener('click', () => {
            currentSelectedDate.setDate(currentSelectedDate.getDate() + 7);
            renderWeekCalendar(currentSelectedDate);
        });
    }

    // ==========================================================================
    // 7. 初始化執行項目
    // ==========================================================================
    renderWeekCalendar(currentSelectedDate);
    updateWaterUI();
    updatePoopOverviewUI();
});