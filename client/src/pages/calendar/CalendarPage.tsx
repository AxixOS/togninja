import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import NextGenCalendar from '../../components/calendar/NextGenCalendar';

const CalendarPage: React.FC = () => {
  return (
    <AdminLayout>
      <NextGenCalendar className="h-full" />
    </AdminLayout>
  );
};

export default CalendarPage;
