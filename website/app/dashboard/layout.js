export const metadata = {
  title: 'DichTuDong - Dashboard',
  description: 'Bảng điều khiển dịch video tự động',
};

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      {children}
    </div>
  );
}
