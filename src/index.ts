export class Log{
    static success(message: string){
        console.log(`%c ${message}` , 'color:green'); // Green text
    }
    static danger(message: string){
        console.log(`%c ${message}` , 'color:red'); // red text
    }
    static info(message: string){
        console.log(`%c ${message}` , 'color:black ; background: yellow'); // yellow background
    }
}

export * from './helper/MathOperations';
export * from './auth/authUtils'; // Functional API
export { AuthService } from './auth/AuthService'; // Class API

export {SipManager} from './sip/SipManager'; // Class API
export type {SipConfig, SipStatus, SipSession, CallStatus, CallDirection, ConnectionPayload} from './sip/types'
