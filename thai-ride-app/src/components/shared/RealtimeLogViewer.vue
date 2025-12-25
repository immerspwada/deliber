<template>
  <div v-if="isVisible" class="log-viewer" :class="{ minimized }">
    <!-- Header -->
    <div class="log-header" @click="toggleMinimize">
      <div class="header-left">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span class="title">Realtime Logs</span>
        <span class="count">{{ filteredLogs.length }}</span>
      </div>
      <div class="header-actions">
        <button
          v-if="!minimized"
          class="action-btn"
          @click.stop="clearLogs"
          title="Clear logs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
            />
          </svg>
        </button>
        <button
          v-if="!minimized"
          class="action-btn"
          @click.stop="exportLogs"
          title="Export logs"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            />
          </svg>
        </button>
        <button class="action-btn" @click.stop="close" title="Close">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="!minimized" class="log-filters">
      <div class="filter-group">
        <button
          v-for="level in levels"
          :key="level"
          class="filter-btn"
          :class="{ active: activeFilters.includes(level) }"
          :style="{ '--color': getLevelColor(level) }"
          @click="toggleFilter(level)"
        >
          <span class="filter-dot"></span>
          {{ level }}
        </button>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="ค้นหา logs..."
      />
    </div>

    <!-- Logs List -->
    <div v-if="!minimized" class="log-list">
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        class="log-entry"
        :class="log.level"
        @click="selectLog(log)"
      >
        <div class="log-time">{{ formatTime(log.timestamp) }}</div>
        <div
          class="log-level"
          :style="{ background: getLevelColor(log.level) }"
        >
          {{ log.level }}
        </div>
        <div class="log-category">{{ log.category }}</div>
        <div class="log-message">{{ log.message }}</div>
      </div>

      <div v-if="filteredLogs.length === 0" class="empty-state">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <p>ไม่มี logs</p>
      </div>
    </div>

    <!-- Log Detail Modal -->
    <div
      v-if="selectedLog && !minimized"
      class="log-detail-modal"
      @click="selectedLog = null"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Log Detail</h3>
          <button class="close-btn" @click="selectedLog = null">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="label">Time:</span>
            <span class="value">{{
              formatFullTime(selectedLog.timestamp)
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Level:</span>
            <span
              class="value"
              :style="{ color: getLevelColor(selectedLog.level) }"
            >
              {{ selectedLog.level }}
            </span>
          </div>
          <div class="detail-row">
            <span class="label">Category:</span>
            <span class="value">{{ selectedLog.category }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Page:</span>
            <span class="value">{{ selectedLog.page }}</span>
          </div>
          <div class="detail-row">
            <span class="label">User ID:</span>
            <span class="value">{{ selectedLog.userId || "N/A" }}</span>
          </div>
          <div class="detail-row full">
            <span class="label">Message:</span>
            <pre class="value">{{ selectedLog.message }}</pre>
          </div>
          <div v-if="selectedLog.data" class="detail-row full">
            <span class="label">Data:</span>
            <pre class="value">{{
              JSON.stringify(selectedLog.data, null, 2)
            }}</pre>
          </div>
          <div v-if="selectedLog.stack" class="detail-row full">
            <span class="label">Stack:</span>
            <pre class="value">{{ selectedLog.stack }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  realtimeLogger,
  type LogEntry,
  type LogLevel,
} from "../../lib/realtimeLogger";

const isVisible = ref(false);
const minimized = ref(false);
const logs = ref<LogEntry[]>([]);
const activeFilters = ref<LogLevel[]>(["error", "warn", "info", "success"]);
const searchQuery = ref("");
const selectedLog = ref<LogEntry | null>(null);

const levels: LogLevel[] = ["error", "warn", "info", "success", "debug"];

// Computed
const filteredLogs = computed(() => {
  return logs.value.filter((log) => {
    // Filter by level
    if (!activeFilters.value.includes(log.level)) return false;

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query) ||
        log.page?.toLowerCase().includes(query)
      );
    }

    return true;
  });
});

// Methods
const toggleFilter = (level: LogLevel) => {
  const index = activeFilters.value.indexOf(level);
  if (index > -1) {
    activeFilters.value.splice(index, 1);
  } else {
    activeFilters.value.push(level);
  }
};

const toggleMinimize = () => {
  minimized.value = !minimized.value;
};

const clearLogs = () => {
  realtimeLogger.clear();
};

const exportLogs = () => {
  realtimeLogger.exportLogs();
};

const close = () => {
  isVisible.value = false;
};

const selectLog = (log: LogEntry) => {
  selectedLog.value = log;
};

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatFullTime = (date: Date) => {
  return new Date(date).toLocaleString("th-TH");
};

const getLevelColor = (level: LogLevel) => {
  const colors: Record<LogLevel, string> = {
    error: "#E53935",
    warn: "#F5A623",
    info: "#2196F3",
    success: "#00A86B",
    debug: "#9C27B0",
  };
  return colors[level];
};

// Keyboard shortcut to toggle
const handleKeyPress = (e: KeyboardEvent) => {
  // Ctrl/Cmd + Shift + L
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L") {
    e.preventDefault();
    isVisible.value = !isVisible.value;
  }
};

// Lifecycle
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  // Subscribe to logs
  unsubscribe = realtimeLogger.subscribe((newLogs) => {
    logs.value = newLogs;
  });

  // Add keyboard listener
  window.addEventListener("keydown", handleKeyPress);

  // Show if in dev mode
  if (import.meta.env.DEV) {
    isVisible.value = true;
  }
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  window.removeEventListener("keydown", handleKeyPress);
});

// Expose toggle method
defineExpose({
  toggle: () => {
    isVisible.value = !isVisible.value;
  },
});
</script>

<style scoped>
.log-viewer {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 600px;
  max-height: 500px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
}

.log-viewer.minimized {
  max-height: 60px;
  width: 250px;
}

/* Header */
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1a1a1a;
  color: #ffffff;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left svg {
  width: 20px;
  height: 20px;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.count {
  padding: 2px 8px;
  background: #00a86b;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* Filters */
.log-filters {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.filter-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #ffffff;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.filter-btn.active {
  border-color: var(--color);
  color: var(--color);
  background: color-mix(in srgb, var(--color) 10%, white);
}

.filter-dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #00a86b;
}

/* Logs List */
.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-entry {
  display: grid;
  grid-template-columns: 80px 70px 120px 1fr;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.log-entry:hover {
  background: #f5f5f5;
  border-color: #e8e8e8;
}

.log-time {
  color: #999999;
  font-family: "Courier New", monospace;
}

.log-level {
  padding: 4px 8px;
  border-radius: 6px;
  color: #ffffff;
  font-weight: 600;
  text-align: center;
  text-transform: uppercase;
  font-size: 10px;
}

.log-category {
  color: #666666;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-message {
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999999;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* Log Detail Modal */
.log-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: #e8e8e8;
}

.close-btn svg {
  width: 16px;
  height: 16px;
  color: #666666;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.detail-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 13px;
}

.detail-row.full {
  grid-template-columns: 1fr;
}

.detail-row .label {
  font-weight: 600;
  color: #666666;
}

.detail-row .value {
  color: #1a1a1a;
  word-break: break-word;
}

.detail-row pre {
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-family: "Courier New", monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
}

/* Scrollbar */
.log-list::-webkit-scrollbar,
.modal-body::-webkit-scrollbar {
  width: 6px;
}

.log-list::-webkit-scrollbar-track,
.modal-body::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.log-list::-webkit-scrollbar-thumb,
.modal-body::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 3px;
}

.log-list::-webkit-scrollbar-thumb:hover,
.modal-body::-webkit-scrollbar-thumb:hover {
  background: #999999;
}

/* Responsive */
@media (max-width: 768px) {
  .log-viewer {
    width: calc(100vw - 40px);
    max-height: 400px;
  }

  .log-viewer.minimized {
    width: 200px;
  }

  .log-entry {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .log-filters {
    flex-direction: column;
  }
}
</style>
