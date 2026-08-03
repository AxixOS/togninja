// TODO: iCal feed endpoint
import { NextApiRequest, NextApiResponse } from 'next';
import ical from 'ical-generator';
import { listEvents } from '../../lib/events';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || Array.isArray(userId)) {
    res.status(400).send('Invalid user');
    return;
  }

  try {
    const events = await listEvents(userId as string);
    const cal = ical({ name: 'Studio Calendar' });

    events.forEach((evt: any) => {
      cal.createEvent({
        id: evt.id,
        start: new Date(evt.start_time),
        end: new Date(evt.end_time),
        summary: evt.title,
        description: evt.notes || '',
      });
    });

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="studio.ics"');
    res.send(cal.toString());
  } catch (error: any) {
    // console.error removed
    res.status(500).send('Unable to generate calendar');
  }
}
