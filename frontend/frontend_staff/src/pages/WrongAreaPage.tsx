import { useEffect } from "react";
import { useStaffAuth } from "@/auth/AuthProvider";
import { config } from "@/config";
import { FullPageMessage } from "@/components/FullPageMessage";

/** DOCTOR / PATIENT accounts do not belong in the staff area. */
export function WrongAreaPage() {
  const { roles, logout } = useStaffAuth();
  const target = roles.includes("DOCTOR")
    ? { url: config.doctorUrl, name: "bác sĩ" }
    : { url: config.patientUrl, name: "bệnh nhân" };

  useEffect(() => {
    if (target.url) window.location.replace(target.url);
  }, [target.url]);

  return (
    <FullPageMessage
      text={
        target.url
          ? `Đang chuyển đến cổng ${target.name}…`
          : `Tài khoản này dành cho cổng ${target.name}, không có quyền vào khu vực nhân viên. Vui lòng mở ứng dụng ${target.name} (hoặc cấu hình VITE_${
              roles.includes("DOCTOR") ? "DOCTOR" : "PATIENT"
            }_URL để tự động chuyển hướng).`
      }
      error={!target.url}
      busy={!!target.url}
      action={{ label: "Đăng xuất", onClick: logout }}
    />
  );
}
