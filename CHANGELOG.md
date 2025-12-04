# Changelog - Plan Hebdomadaire 2025-2026

## [Fix] Date Validation and Word Generation - 2025-12-04

### 🐛 Issues Fixed

1. **Saturday (Samedi) Validation Error - ROOT CAUSE FOUND**
   - **Problem:** Saturday and Friday were appearing in the UI and Word documents
   - **Root Cause:** Frontend script.js was using 7-day arrays instead of 5-day school week
   - **Fix:** Updated all day arrays in script.js from 7 to 5 days (all languages: FR, AR, EN)

2. **Backend Date Validation**
   - **Problem:** Backend was accepting Friday/Saturday from frontend
   - **Fix:** Added strict server-side validation to reject Friday and Saturday

3. **Date Format Inconsistencies**
   - **Problem:** Inconsistent date handling across different formats
   - **Fix:** Enhanced date parsing for all formats (French full date, ISO, DD/MM/YYYY)

4. **Word Document Generation**
   - **Problem:** Incorrect date ranges being passed to templates
   - **Fix:** Added validation to ensure only valid school days are included

### ✅ Changes Made

#### Date Validation
- Modified `formatDateFrenchNode()` to reject Friday/Saturday
- Updated `getDateForDayNameNode()` to only accept 5-day week
- Enhanced `parseDateFromJourValue()` with strict school day validation
- Added warning logs for invalid days

#### Code Updates
- **`dayOrder`**: Now only contains `["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"]`
- **`dayMapFr`**: Reduced from 7 to 5 days (removed Vendredi, Samedi)
- **Date arrays**: Updated to 5-day week in all functions

#### New Features
- Added `validateWeekDateRanges()` function
- Automatic validation on server startup
- Enhanced logging for date issues
- Better error messages for invalid dates

### 📋 Week Structure

**School Week: 5 Days Only**
- Dimanche (Sunday) - Day 0
- Lundi (Monday) - Day 1  
- Mardi (Tuesday) - Day 2
- Mercredi (Wednesday) - Day 3
- Jeudi (Thursday) - Day 4

**NOT VALID:**
- ❌ Vendredi (Friday) - Day 5
- ❌ Samedi (Saturday) - Day 6

### 🔍 Validation Rules

1. **Week Start Date:** Must be Sunday (day 0)
2. **Week End Date:** Must be Thursday (day 4)
3. **Week Duration:** Exactly 4 days difference (Sunday to Thursday)
4. **Date Parsing:** Rejects any Friday or Saturday dates
5. **Word Generation:** Only processes 5 valid days

### 🧪 Testing

To verify the fixes are working:

```javascript
// Check week 14
const start = new Date('2025-11-30T00:00:00Z');
const end = new Date('2025-12-04T00:00:00Z');
console.log(start.getUTCDay()); // 0 (Sunday)
console.log(end.getUTCDay());   // 4 (Thursday)

// Check week 15
const start = new Date('2025-12-07T00:00:00Z');
const end = new Date('2025-12-11T00:00:00Z');
console.log(start.getUTCDay()); // 0 (Sunday)
console.log(end.getUTCDay());   // 4 (Thursday)
```

### 📝 Files Modified

**Commit 1 (76c7e27):** Backend fixes
- `api/index.js` - Core date validation and Word generation logic
- `WORD_TEMPLATE_STRUCTURE.md` - Updated documentation
- `CHANGELOG.md` - This file (new)

**Commit 2 (6f93fb5):** Frontend fixes (CRITICAL)
- `public/script.js` - Fixed day arrays from 7 to 5 days in all languages
- Removed Friday/Saturday from all date validation and display logic

### 🚀 Deployment Notes

- No database changes required
- No breaking changes to API
- Backward compatible with existing data
- Enhanced error logging for debugging

### ⚠️ Important Notes

- All existing data with Friday/Saturday dates will be flagged with warnings
- Word generation will skip invalid days with clear error messages
- Excel exports will mark invalid days as `[INVALID]`
- No data will be lost, only validation is stricter

---

**Fixed by:** AI Assistant  
**Date:** 2025-12-04  
**Repository:** medch24/Plan-hebdomadaire-2026-Garcons  
**Branch:** main
