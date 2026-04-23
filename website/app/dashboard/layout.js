export const metadata = {
  title: 'B2Vision - Dashboard',
  description: 'Bảng điều khiển dịch video tự động',
};

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      {children}
    </div>
  );
}
