const Razorpay = require('razorpay');
const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'Qo9u5rOfjFo6ov36FQCe2P8i'
});

console.log('Keys on rzp.qrCode:', Object.keys(rzp.qrCode));
console.log('Prototype keys:', Object.getOwnPropertyNames(rzp.qrCode));

async function testCreate() {
  try {
    const qr = await rzp.qrCode.create({
      type: 'upi_qr',
      name: 'ShopIndia Order',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: 11083, // 110.83 in paise
      description: 'Doorstep UPI QR for Order OD-TEST',
      notes: { orderId: 'test' }
    });
    console.log('Created QR successfully:', qr);
  } catch (err) {
    console.error('Error creating QR:', err);
  }
}
testCreate();
