import api from '../config/api';

export const getNotifications = async (unreadOnly = false) => {
  const response = await api.get(`/notifications?unread_only=${unreadOnly}`);
  return response.data;
};

export const markNotificationRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};
