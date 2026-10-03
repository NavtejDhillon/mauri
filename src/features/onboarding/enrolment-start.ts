// What startEnrolment returns: the new factor, its QR code, key and otpauth link, or a message.
export type EnrolmentStart = { factorId: string; qrCode: string; secret: string; uri: string } | { error: string };
