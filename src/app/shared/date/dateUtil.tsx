// Set default timezone
import moment from 'moment-timezone';
moment.tz.setDefault('Europe/Madrid');

export const getTodayEndOfDay = () => {
    return moment().endOf('day').format();
};

export const getTodayStartOfDay = () => {
    return moment().startOf('day').format();
};

export const formatDate = (date: Date, format: string): string => {
    return moment(date).format(format);
};