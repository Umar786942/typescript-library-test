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