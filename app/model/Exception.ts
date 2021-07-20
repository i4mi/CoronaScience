export default class Exception {
    code: string;
    message: string;
    originalException: any;

    constructor(code: string, message: string, originalException: any) {
        this.code = code;
        this.message = message;
        this.originalException = originalException;
    }

    toString(): string {
        return `${this.code}: ${this.message}. \n ${JSON.stringify(this.originalException)}`;
    }
}