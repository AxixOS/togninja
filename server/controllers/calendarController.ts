/**
 * Calendar Controller
 * Handles studio appointment management and calendar operations
 */

import { Request, Response } from 'express';
import StudioCalendarService from '../services/calendarService';

/**
 * Create a new appointment
 */
export const createAppointment = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      title,
      description,
      appointmentType,
      startDateTime,
      endDateTime,
      location,
      notes,
      reminderDateTime,
      syncToGoogle = true
    } = req.body;

    if (!clientId || !title || !appointmentType || !startDateTime || !endDateTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, title, appointmentType, startDateTime, endDateTime'
      });
    }

    const result = await StudioCalendarService.createAppointment({
      clientId,
      title,
      description,
      appointmentType,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      location,
      notes,
      reminderDateTime: reminderDateTime ? new Date(reminderDateTime) : undefined,
      syncToGoogle,
    });

    if (result.success) {
      res.json({
        success: true,
        appointmentId: result.appointmentId,
        googleEventId: result.googleEventId,
        message: 'Appointment created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update an existing appointment
 */
export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;
    const {
      title,
      description,
      appointmentType,
      status,
      startDateTime,
      endDateTime,
      location,
      notes,
      reminderDateTime,
      syncToGoogle = true
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID required'
      });
    }

    const result = await StudioCalendarService.updateAppointment({
      id: appointmentId,
      title,
      description,
      appointmentType,
      status,
      startDateTime: startDateTime ? new Date(startDateTime) : undefined,
      endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      location,
      notes,
      reminderDateTime: reminderDateTime ? new Date(reminderDateTime) : undefined,
      syncToGoogle,
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Appointment updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get appointments for a date range
 */
export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date required'
      });
    }

    const appointments = await StudioCalendarService.getAppointments(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      appointments
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get appointments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get appointments for a specific client
 */
export const getClientAppointments = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID required'
      });
    }

    const appointments = await StudioCalendarService.getClientAppointments(clientId);

    res.json({
      success: true,
      appointments
    });

  } catch (error) {
    console.error('Get client appointments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get client appointments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete an appointment
 */
export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        error: 'Appointment ID required'
      });
    }

    const result = await StudioCalendarService.deleteAppointment(appointmentId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Appointment deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete appointment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get available time slots
 */
export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date required'
      });
    }

    const targetDate = new Date(date as string);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(9, 0, 0, 0); // Studio opens at 9 AM
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(18, 0, 0, 0); // Studio closes at 6 PM

    // Get existing appointments for the day
    const existingAppointments = await StudioCalendarService.getAppointments(
      startOfDay,
      endOfDay
    );

    // Generate available slots
    const slots = [];
    const slotDuration = parseInt(duration as string); // Duration in minutes
    
    for (let hour = 9; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

        // Check if slot conflicts with existing appointments
        const hasConflict = existingAppointments.some(appointment => {
          const appointmentStart = new Date(appointment.startDateTime);
          const appointmentEnd = new Date(appointment.endDateTime);
          
          return (
            (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
          );
        });

        if (!hasConflict && slotEnd.getHours() <= 18) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: true
          });
        }
      }
    }

    res.json({
      success: true,
      date: date,
      duration: slotDuration,
      availableSlots: slots
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available slots',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default {
  createAppointment,
  updateAppointment,
  getAppointments,
  getClientAppointments,
  deleteAppointment,
  getAvailableSlots,
};
