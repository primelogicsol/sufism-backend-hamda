export default {
  urlSenderMessage: (url: string, expireyTime: string) => {
    const message = `<br>  Please use this url code <span style="color: blue; font-weight: bold"> ${url} </span> to verify your account. If you did not request this , please ignore it.<br>${expireyTime ? `<span style="text-align:center; color:red; display:block;font-weight:bold;"><i>OTP is valid for ${expireyTime}</i></span>` : ""}`;
    return message;
  },
  interviewScheduleMessage: () => {
    return "Your interview has been scheduled. We will contact you soon with the next steps. Current status: Pending.";
  },
  vendorApprovalMessage: () => {
    return "Thanks for your vendor approval request! We’ll get back to you soon.";
  },
  orderFailureMessage: (reason: string) => {
    return `<br>Your Order attempt failed. <span style="color: red; font-weight: bold;">Reason: ${reason}</span><br>Please try again or contact support if the issue persists.`;
  },
  donationFailureMessage: (reason: string) => {
    return `<br>Your donation attempt failed. <span style="color: red; font-weight: bold;">Reason: ${reason}</span><br>Please try again or contact support if the issue persists.`;
  },
  orderSuccessMessage: (orderId: string, amount: string) => {
    return `<br>Your order (ID: <span style="color: blue; font-weight: bold;">${orderId}</span>) was successful! Amount paid: <span style="color: green; font-weight: bold;">$${amount}</span>.<br>Thank you for your purchase. You can view your order details in your account.`;
  }
};
