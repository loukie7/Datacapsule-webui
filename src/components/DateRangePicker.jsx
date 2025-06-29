import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

function DateRangePicker({ startDate, endDate, onDateChange, placeholder = "开始日期 至 结束日期" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const containerRef = useRef(null);

  // 关闭日历
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 获取月份的所有日期
  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const dates = [];

    // 添加前一个月的末尾日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      dates.push({ date: prevDate, isCurrentMonth: false });
    }

    // 添加当前月的所有日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
      dates.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }

    // 添加下一个月的开始日期，确保总共42个格子（6周）
    const remainingDays = 42 - dates.length;
    for (let day = 1; day <= remainingDays; day++) {
      dates.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }

    return dates;
  };

  // 格式化日期为字符串
  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // 解析日期字符串
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00');
  };

  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);

  // 检查日期是否在选择范围内
  const isDateInRange = (date) => {
    if (!startDateObj || !endDateObj) return false;
    return date >= startDateObj && date <= endDateObj;
  };

  // 检查日期是否在悬停范围内
  const isDateInHoverRange = (date) => {
    if (!startDateObj || !hoveredDate || endDateObj) return false;
    const start = startDateObj;
    const end = hoveredDate;
    return date >= Math.min(start, end) && date <= Math.max(start, end);
  };

  // 处理日期点击
  const handleDateClick = (date) => {
    const dateStr = formatDate(date);
    
    if (!startDateObj || (startDateObj && endDateObj)) {
      // 开始新的选择
      onDateChange(dateStr, '');
    } else if (startDateObj && !endDateObj) {
      // 选择结束日期
      if (date >= startDateObj) {
        onDateChange(startDate, dateStr);
      } else {
        onDateChange(dateStr, startDate);
      }
      setIsOpen(false);
    }
  };

  // 获取显示的日期范围文本
  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${startDate} 至 ${endDate}`;
    } else if (startDate) {
      return `${startDate} 至 结束日期`;
    }
    return placeholder;
  };

  // 渲染日历
  const renderCalendar = (monthDate) => {
    const dates = getMonthDates(monthDate);
    const monthName = monthDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

    return (
      <div className="p-4">
        <div className="text-center font-medium text-gray-900 mb-4">
          {monthName}
        </div>
        
        {/* 星期标题 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {dates.map(({ date, isCurrentMonth }, index) => {
            const isSelected = (startDateObj && date.getTime() === startDateObj.getTime()) ||
                             (endDateObj && date.getTime() === endDateObj.getTime());
            const isInRange = isDateInRange(date);
            const isInHoverRange = isDateInHoverRange(date);
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => setHoveredDate(date)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`
                  w-8 h-8 text-sm rounded flex items-center justify-center relative
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${isSelected ? 'bg-blue-600 text-white' : ''}
                  ${isInRange && !isSelected ? 'bg-blue-100 text-blue-900' : ''}
                  ${isInHoverRange && !isInRange && !isSelected ? 'bg-blue-50' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-blue-600' : ''}
                  ${isCurrentMonth ? 'hover:bg-gray-100' : ''}
                  transition-colors
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      >
        <CalendarIcon className="h-4 w-4 text-gray-400" />
        <span className={`text-sm ${startDate || endDate ? 'text-gray-900' : 'text-gray-500'}`}>
          {getDisplayText()}
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              选择日期范围
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex">
            {renderCalendar(currentMonth)}
            {renderCalendar(nextMonth)}
          </div>
          
          {(startDate || endDate) && (
            <div className="px-4 py-2 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onDateChange('', '');
                  setIsOpen(false);
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                清除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DateRangePicker; 