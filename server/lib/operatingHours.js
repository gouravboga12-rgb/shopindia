'use strict';

/**
 * server/lib/operatingHours.js
 * Evaluates Indian Standard Time (IST) against dynamic Super Admin
 * Midnight Blackout and Friday Prayer Break schedules.
 */

function getPlatformOperatingStatus(settings = {}) {
  const now = new Date();
  // Compute current date & time in Indian Standard Time (Asia/Kolkata)
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const dayOfWeek = istDate.getDay(); // 0 = Sunday, 5 = Friday
  const currentHours = istDate.getHours();
  const currentMinutes = istDate.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;
  const currentSeconds = istDate.getSeconds();

  // 1. Friday Prayer Break
  const fridayEnabled = String(settings['friday_break_enabled']) === 'true';
  const targetDay = parseInt(settings['friday_break_day'] || '5', 10); // 5 = Friday
  const [fStartH, fStartM] = (settings['friday_break_start'] || '12:00').split(':').map(Number);
  const [fEndH, fEndM] = (settings['friday_break_end'] || '14:00').split(':').map(Number);
  const fStartTimeMinutes = (fStartH || 12) * 60 + (fStartM || 0);
  const fEndTimeMinutes = (fEndH || 14) * 60 + (fEndM || 0);

  let isFridayBreakActive = false;
  let fridayRemainingSeconds = 0;

  if (fridayEnabled && dayOfWeek === targetDay) {
    if (currentTimeMinutes >= fStartTimeMinutes && currentTimeMinutes < fEndTimeMinutes) {
      isFridayBreakActive = true;
      const totalEndSeconds = fEndTimeMinutes * 60 * 60;
      const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;
      fridayRemainingSeconds = Math.max(0, totalEndSeconds - currentTotalSeconds);
    }
  }

  // 2. Midnight Blackout (Overnight or intra-day window)
  const midnightEnabled = String(settings['midnight_blackout_enabled']) === 'true';
  const [mStartH, mStartM] = (settings['midnight_blackout_start'] || '23:00').split(':').map(Number);
  const [mEndH, mEndM] = (settings['midnight_blackout_end'] || '07:00').split(':').map(Number);
  const mStartTimeMinutes = (mStartH || 23) * 60 + (mStartM || 0);
  const mEndTimeMinutes = (mEndH || 7) * 60 + (mEndM || 0);

  let isMidnightActive = false;
  let midnightRemainingSeconds = 0;

  if (midnightEnabled) {
    if (mStartTimeMinutes > mEndTimeMinutes) {
      // Crosses midnight (e.g., 23:00 to 07:00)
      if (currentTimeMinutes >= mStartTimeMinutes || currentTimeMinutes < mEndTimeMinutes) {
        isMidnightActive = true;
        let diffMinutes = 0;
        if (currentTimeMinutes >= mStartTimeMinutes) {
          diffMinutes = (24 * 60 - currentTimeMinutes) + mEndTimeMinutes;
        } else {
          diffMinutes = mEndTimeMinutes - currentTimeMinutes;
        }
        midnightRemainingSeconds = Math.max(0, diffMinutes * 60 - currentSeconds);
      }
    } else {
      // Intra-day (e.g., 01:00 to 06:00)
      if (currentTimeMinutes >= mStartTimeMinutes && currentTimeMinutes < mEndTimeMinutes) {
        isMidnightActive = true;
        const diffMinutes = mEndTimeMinutes - currentTimeMinutes;
        midnightRemainingSeconds = Math.max(0, diffMinutes * 60 - currentSeconds);
      }
    }
  }

  return {
    fridayBreak: {
      isEnabled: fridayEnabled,
      isActive: isFridayBreakActive,
      remainingSeconds: fridayRemainingSeconds,
      title: settings['friday_break_title'] || 'Friday Prayer Break',
      subtitle: settings['friday_break_subtitle'] || "We're briefly closed for Friday Prayer (12:00 PM – 2:00 PM)",
      message: settings['friday_break_message'] || 'Our services will resume shortly.',
      verticals: settings['friday_break_verticals'] || 'both', // 'quick', 'services', 'both'
      start: settings['friday_break_start'] || '12:00',
      end: settings['friday_break_end'] || '14:00',
    },
    midnightBlackout: {
      isEnabled: midnightEnabled,
      isActive: isMidnightActive,
      remainingSeconds: midnightRemainingSeconds,
      title: settings['midnight_blackout_title'] || "Closed for the day! We'll be back at 7 AM.",
      message: settings['midnight_blackout_message'] || "We are currently closed for the night. You can browse products and services; orders will reopen at 7:00 AM.",
      verticals: settings['midnight_blackout_verticals'] || 'both',
      start: settings['midnight_blackout_start'] || '23:00',
      end: settings['midnight_blackout_end'] || '07:00',
    }
  };
}

module.exports = {
  getPlatformOperatingStatus,
};

