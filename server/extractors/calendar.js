import ICAL from 'ical.js';
import { readTextFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractCalendar(filePath, options = {}) {
  const { maxEvents = 50 } = options;

  logger.debug(`Extracting calendar from: ${filePath}`);

  try {
    const content = await readTextFile(filePath);
    const jcalData = ICAL.parse(content);
    const comp = new ICAL.Component(jcalData);

    const events = comp.getAllSubcomponents('vevent');
    const parsedEvents = [];

    for (const event of events.slice(0, maxEvents)) {
      const vevent = new ICAL.Event(event);

      parsedEvents.push({
        summary: vevent.summary || 'Untitled Event',
        description: vevent.description || null,
        location: vevent.location || null,
        startDate: vevent.startDate?.toString() || null,
        endDate: vevent.endDate?.toString() || null,
        organizer: vevent.organizer || null,
      });
    }

    const calendarName = comp.getFirstPropertyValue('x-wr-calname') || 'Calendar';

    const textContent = parsedEvents
      .map((e) => `Event: ${e.summary}${e.startDate ? ` (${e.startDate})` : ''}`)
      .join('\n');

    return {
      content: textContent,
      metadata: {
        calendarName,
        eventCount: events.length,
        events: parsedEvents,
      },
    };
  } catch (error) {
    logger.error(`Calendar extraction failed: ${error.message}`);
    return {
      content: `Calendar file: ${filePath}`,
      metadata: {
        error: error.message,
      },
    };
  }
}

export default extractCalendar;
