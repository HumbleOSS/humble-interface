interface StatsCardProps {
  title: string;
  value: string;
  change: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, change }) => {
  const isPositive = change.startsWith('+');
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-gray-600 text-sm">{title}</h3>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {change}
      </div>
    </div>
  );
}; 