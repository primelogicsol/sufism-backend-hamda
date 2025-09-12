export default {
  urlSenderMessage: (url: string, expireyTime: string) => {
    const message = `<br>  Please use this url code <span style="color: blue; font-weight: bold"> ${url} </span> to verify your account. If you did not request this , please ignore it.<br>${expireyTime ? `<span style="text-align:center; color:red; display:block;font-weight:bold;"><i>OTP is valid for ${expireyTime}</i></span>` : ""}`;
    return message;
  },
  interviewScheduleMessage: () => {
    return "Your interview has been scheduled. We will contact you soon with the next steps. Current status: Pending.";
  }
};
