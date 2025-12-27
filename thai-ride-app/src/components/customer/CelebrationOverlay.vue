<script setup lang="ts">
/**
 * CelebrationOverlay - Celebration Effects Display
 * Feature: F272 - Celebration Moments UI
 * MUNEEF Style: สีเขียว #00A86B
 */
import { computed } from "vue";
import { useCelebrationMoments } from "../../composables/useCelebrationMoments";

const {
  isShowingCelebration,
  particles,
  showingAchievement,
  showingMilestone,
} = useCelebrationMoments();

const rarityColors = {
  common: { bg: "#E8E8E8", text: "#666666", border: "#CCCCCC" },
  rare: { bg: "#E3F2FD", text: "#1976D2", border: "#64B5F6" },
  epic: { bg: "#F3E5F5", text: "#7B1FA2", border: "#BA68C8" },
  legendary: { bg: "#FFF8E1", text: "#F57F17", border: "#FFD54F" },
};

const getAchievementStyle = computed(() => {
  if (!showingAchievement.value) return {};
  const colors = rarityColors[showingAchievement.value.rarity];
  return {
    "--achievement-bg": colors.bg,
    "--achievement-text": colors.text,
    "--achievement-border": colors.border,
  };
});
</script>

<template>
  <!-- Particles Canvas -->
  <div v-if="isShowingCelebration" class="celebration-overlay">
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="particle"
      :style="{
        left: `${particle.x}px`,
        top: `${particle.y}px`,
        width: `${particle.size}px`,
        height: `${particle.size}px`,
        backgroundColor: particle.color,
        transform: `rotate(${particle.rotation}deg)`,
        opacity: particle.opacity,
      }"
    />
  </div>

  <!-- Achievement Modal -->
  <Teleport to="body">
    <Transition name="achievement">
      <div v-if="showingAchievement" class="achievement-overlay">
        <div class="achievement-card" :style="getAchievementStyle">
          <div class="achievement-glow"></div>

          <div class="achievement-icon">
            <span class="icon-emoji">{{ showingAchievement.icon }}</span>
          </div>

          <div class="achievement-content">
            <span class="achievement-label">ปลดล็อคความสำเร็จ!</span>
            <h3 class="achievement-title">{{ showingAchievement.title }}</h3>
            <p class="achievement-description">
              {{ showingAchievement.description }}
            </p>
          </div>

          <div class="achievement-rarity">
            <span :class="['rarity-badge', showingAchievement.rarity]">
              {{
                showingAchievement.rarity === "common"
                  ? "ทั่วไป"
                  : showingAchievement.rarity === "rare"
                  ? "หายาก"
                  : showingAchievement.rarity === "epic"
                  ? "พิเศษ"
                  : "ตำนาน"
              }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Milestone Modal -->
  <Teleport to="body">
    <Transition name="milestone">
      <div v-if="showingMilestone" class="milestone-overlay">
        <div class="milestone-card">
          <div class="milestone-stars">
            <svg viewBox="0 0 24 24" fill="#FFD700">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>
            <svg viewBox="0 0 24 24" fill="#FFD700" class="star-large">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>
            <svg viewBox="0 0 24 24" fill="#FFD700">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>
          </div>

          <h3 class="milestone-title">{{ showingMilestone.title }}</h3>

          <div class="milestone-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: `${
                    (showingMilestone.value / showingMilestone.target) * 100
                  }%`,
                }"
              ></div>
            </div>
            <span class="progress-text">
              {{ showingMilestone.value }} / {{ showingMilestone.target }}
            </span>
          </div>

          <div v-if="showingMilestone.reward" class="milestone-reward">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
            <span>{{ showingMilestone.reward }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.celebration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 2px;
  pointer-events: none;
}

/* Achievement Overlay */
.achievement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  padding: 20px;
}

.achievement-card {
  position: relative;
  width: 100%;
  max-width: 320px;
  padding: 32px 24px;
  background: var(--achievement-bg, #ffffff);
  border: 3px solid var(--achievement-border, #00a86b);
  border-radius: 24px;
  text-align: center;
  overflow: hidden;
}

.achievement-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 70%
  );
  animation: glow-rotate 3s linear infinite;
}

@keyframes glow-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.achievement-icon {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  animation: icon-bounce 0.6s ease;
}

@keyframes icon-bounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.icon-emoji {
  font-size: 40px;
}

.achievement-content {
  position: relative;
}

.achievement-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--achievement-text, #00a86b);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.achievement-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.achievement-description {
  font-size: 14px;
  color: #666666;
  margin-bottom: 16px;
}

.achievement-rarity {
  position: relative;
}

.rarity-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.rarity-badge.common {
  background: #e8e8e8;
  color: #666666;
}
.rarity-badge.rare {
  background: #e3f2fd;
  color: #1976d2;
}
.rarity-badge.epic {
  background: #f3e5f5;
  color: #7b1fa2;
}
.rarity-badge.legendary {
  background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%);
  color: #1a1a1a;
}

/* Milestone Overlay */
.milestone-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  padding: 20px;
}

.milestone-card {
  width: 100%;
  max-width: 320px;
  padding: 32px 24px;
  background: #ffffff;
  border-radius: 24px;
  text-align: center;
}

.milestone-stars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.milestone-stars svg {
  width: 32px;
  height: 32px;
  animation: star-pop 0.5s ease backwards;
}

.milestone-stars svg:nth-child(1) {
  animation-delay: 0.1s;
}
.milestone-stars svg:nth-child(2) {
  animation-delay: 0.2s;
}
.milestone-stars svg:nth-child(3) {
  animation-delay: 0.3s;
}

.milestone-stars .star-large {
  width: 48px;
  height: 48px;
}

@keyframes star-pop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.milestone-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 20px;
}

.milestone-progress {
  margin-bottom: 20px;
}

.progress-bar {
  height: 12px;
  background: #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00a86b 0%, #008f5b 100%);
  border-radius: 6px;
  transition: width 1s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #00a86b;
}

.milestone-reward {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #e8f5ef;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #00a86b;
}

.milestone-reward svg {
  width: 20px;
  height: 20px;
}

/* Transitions */
.achievement-enter-active,
.achievement-leave-active,
.milestone-enter-active,
.milestone-leave-active {
  transition: all 0.3s ease;
}

.achievement-enter-from,
.achievement-leave-to,
.milestone-enter-from,
.milestone-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
