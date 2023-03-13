export function converteMinutesToHoursAndMinutes(totalMinutes: number) {
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const minutesText = minutes > 0 ? `${minutes}min` : minutes > 1 ? `${minutes}min` : "";
  const hoursText = hours > 0 ? `${hours}h` : hours > 1 ? `${hours}hrs` : "";


  const totalText = `${hoursText} ${minutesText}`;
  return totalText.trim(); 
}
