'use strict';

/**
 * server/lib/operatingHours.js
 * Evaluates Indian Standard Time (IST) against dynamic Super Admin
 * Midnight Blackout and Friday Prayer Break schedules.
 */

/**
 * Helper to robustly parse a time string (12-hour with AM/PM or 24-hour) into total minutes from midnight.
 * e.g. "23:00" -> 1380
 * e.g. "11:00 PM" -> 1380
 * e.g. "02:00 PM" -> 840
 * e.g. "02:00" with isAfternoonHint=true -> 840 (14:00)
 */
function parseTimeToMinutes(timeStr, defaultMinutes = 0, isAfternoonHint = false) {
  if (!timeStr || typeof timeStr !== 'string') return defaultMinutes;
  const raw = timeStr.trim().toUpperCase();

  const isPM = raw.includes('PM');
  const isAM = raw.includes('AM');
  const clean = raw.replace(/[^\d:]/g, '');
  const parts = clean.split(':').map(Number);
  if (parts.length === 0 || isNaN(parts[0])) return defaultMinutes;

  let hours = parts[0];
  const minutes = parts[1] || 0;

  if (isPM) {
    if (hours < 12) hours += 12;
  } else if (isAM) {
    if (hours === 12) hours = 0;
  } else if (isAfternoonHint && hours >= 1 && hours <= 6) {
    // Intelligent heuristic: For lunch/afternoon slots like Friday prayer end (02:00), treat 1-6 without AM/PM as afternoon
    hours += 12;
  }

  return (hours % 24) * 60 + minutes;
}

function formatMinutesTo12Hour(minutes) {
  const m = Math.max(0, minutes % (24 * 60));
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const padMin = min < 10 ? `0${min}` : `${min}`;
  return `${h12}:${padMin} ${period}`;
}

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
  const fStartTimeMinutes = parseTimeToMinutes(settings['friday_break_start'], 12 * 60); // Default 12:00 PM
  const fEndTimeMinutes = parseTimeToMinutes(settings['friday_break_end'], 14 * 60, true); // Default 02:00 PM (14:00)

  let isFridayBreakActive = false;
  let fridayRemainingSeconds = 0;

  if (fridayEnabled && dayOfWeek === targetDay) {
    if (currentTimeMinutes >= fStartTimeMinutes && currentTimeMinutes < fEndTimeMinutes) {
      isFridayBreakActive = true;
      const totalEndSeconds = fEndTimeMinutes * 60;
      const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;
      fridayRemainingSeconds = Math.max(0, totalEndSeconds - currentTotalSeconds);
    }
  }

  // 2. Midnight Blackout (Overnight or intra-day window)
  const midnightEnabled = String(settings['midnight_blackout_enabled']) === 'true';
  const mStartTimeMinutes = parseTimeToMinutes(settings['midnight_blackout_start'], 23 * 60); // Default 11:00 PM
  const mEndTimeMinutes = parseTimeToMinutes(settings['midnight_blackout_end'], 7 * 60); // Default 07:00 AM

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
    serverIstTime: `${istDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}, ${formatMinutesTo12Hour(currentTimeMinutes)}`,
    fridayBreak: {
      isEnabled: fridayEnabled,
      isActive: isFridayBreakActive,
      remainingSeconds: fridayRemainingSeconds,
      title: settings['friday_break_title'] || 'Friday Prayer Break',
      subtitle: settings['friday_break_subtitle'] || `We're briefly closed for Friday Prayer (${formatMinutesTo12Hour(fStartTimeMinutes)} – ${formatMinutesTo12Hour(fEndTimeMinutes)})`,
      message: settings['friday_break_message'] || 'Our deliveries and field services are on a brief break for Friday Jummah prayers.',
      verticals: settings['friday_break_verticals'] || 'both', // 'quick', 'services', 'both'
      start: settings['friday_break_start'] || '12:00',
      end: settings['friday_break_end'] || '14:00',
      formattedStart: formatMinutesTo12Hour(fStartTimeMinutes),
      formattedEnd: formatMinutesTo12Hour(fEndTimeMinutes),
    },
    midnightBlackout: {
      isEnabled: midnightEnabled,
      isActive: isMidnightActive,
      remainingSeconds: midnightRemainingSeconds,
      title: settings['midnight_blackout_title'] || `Closed for the day! We'll be back at ${formatMinutesTo12Hour(mEndTimeMinutes)}.`,
      message: settings['midnight_blackout_message'] || `We are currently closed for the night. You can browse products and services; orders will reopen at ${formatMinutesTo12Hour(mEndTimeMinutes)}.`,
      verticals: settings['midnight_blackout_verticals'] || 'both',
      start: settings['midnight_blackout_start'] || '23:00',
      end: settings['midnight_blackout_end'] || '07:00',
      formattedStart: formatMinutesTo12Hour(mStartTimeMinutes),
      formattedEnd: formatMinutesTo12Hour(mEndTimeMinutes),
    }
  };
}

module.exports = {
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  getPlatformOperatingStatus,
};
