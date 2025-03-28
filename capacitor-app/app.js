document.addEventListener("DOMContentLoaded", () => {
  // Nếu chạy trong môi trường native, Capacitor sẽ có window.Capacitor.Plugins
  let localNotifications, share;
  if (window.Capacitor && window.Capacitor.Plugins) {
    const plugins = window.Capacitor.Plugins;
    localNotifications = plugins.LocalNotifications;
    share = plugins.Share;

    // Yêu cầu quyền thông báo khi khởi động
    (async () => {
      try {
        const perm = await localNotifications.requestPermissions();
        console.log("Quyền thông báo:", perm);
      } catch (error) {
        console.error("Lỗi yêu cầu quyền thông báo:", error);
      }
    })();
  } else {
    console.warn("Capacitor không khả dụng. Ứng dụng đang chạy trên trình duyệt.");
  }

  // Tham chiếu đến các phần tử giao diện theo id trong file HTML
  const birthdayInput = document.getElementById("birthdayInput");
  const calcBtn = document.getElementById("calculateBtn");
  const resultElem = document.getElementById("result");
  const shareBtn = document.getElementById("shareBtn");
  const batteryElem = document.getElementById("batteryStatus");

  // Hàm tính số ngày còn lại đến sinh nhật tiếp theo
  function calculateCountdown(birthdayStr) {
    // birthdayStr: "dd/mm"
    const parts = birthdayStr.split("/");
    if (parts.length !== 2) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Chuyển đổi tháng: JS 0-11
    if (isNaN(day) || isNaN(month)) return null;

    const now = new Date();
    let birthdayThisYear = new Date(now.getFullYear(), month, day);

    // Nếu sinh nhật năm nay đã qua, tính cho năm sau
    if (birthdayThisYear < now) {
      birthdayThisYear = new Date(now.getFullYear() + 1, month, day);
    }

    const diffMs = birthdayThisYear - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Xử lý khi người dùng nhấn nút "Tính toán"
  calcBtn.addEventListener("click", async () => {
    const birthdayStr = birthdayInput.value.trim();
    const daysLeft = calculateCountdown(birthdayStr);
    if (daysLeft === null) {
      alert("Vui lòng nhập ngày sinh theo định dạng dd/mm (VD: 15/08)");
      return;
    }
    const resultText = `Còn ${daysLeft} ngày nữa đến sinh nhật của bạn!`;
    resultElem.innerText = resultText;
    shareBtn.style.display = "block";

    // Gửi thông báo cục bộ nếu có plugin LocalNotifications
    if (localNotifications) {
      try {
        // Sử dụng modulo để đảm bảo id không vượt quá giới hạn Java int
        const notifId = Math.floor(Date.now() % 2147483647);
        await localNotifications.schedule({
          notifications: [{
            id: notifId,
            title: "Đếm ngược sinh nhật",
            body: resultText,
            schedule: { at: new Date(Date.now() + 1000) }
          }]
        });
        console.log("Đã gửi thông báo cục bộ");
      } catch (error) {
        console.error("Lỗi gửi thông báo:", error);
      }
    } else {
      console.log("LocalNotifications không khả dụng trên trình duyệt.");
    }
  });

  // Xử lý khi người dùng nhấn nút "Chia sẻ kết quả"
  shareBtn.addEventListener("click", async () => {
    const resultText = resultElem.innerText;
    if (!resultText) {
      alert("Chưa có kết quả để chia sẻ!");
      return;
    }
    if (share && share.share) {
      try {
        await share.share({
          title: "Đếm ngược sinh nhật của tôi",
          text: resultText,
          dialogTitle: "Chia sẻ kết quả"
        });
      } catch (error) {
        console.error("Lỗi chia sẻ:", error);
        alert("Không thể chia sẻ kết quả.");
      }
    } else {
      alert("Chức năng chia sẻ không khả dụng trên trình duyệt này.");
    }
  });

  // BONUS: Hiển thị trạng thái pin nếu trình duyệt hỗ trợ Battery Status API
  if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
      function updateBatteryStatus() {
        batteryElem.innerText = `Trạng thái pin: ${Math.round(battery.level * 100)}%${battery.charging ? " (Đang sạc)" : ""}`;
      }
      updateBatteryStatus();
      battery.addEventListener("levelchange", updateBatteryStatus);
    }).catch(error => {
      console.error("Không lấy được thông tin pin:", error);
      batteryElem.innerText = "Không lấy được thông tin pin.";
    });
  } else {
    batteryElem.innerText = "Battery API không khả dụng.";
  }
});
