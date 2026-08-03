import axios from 'axios';
// TODO: Adjust the import path to your toast/notification component
import { toast } from '@/components/Toast';

export const http = axios.create();

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Unexpected error';

    // Display toast notification if available
    if (toast && typeof toast.error === 'function') {
      toast.error(message);
    } else {
      // console.error removed
    }

    return Promise.reject(error);
  }
);
