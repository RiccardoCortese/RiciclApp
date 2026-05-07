export default class Autenticazione{
    //Costruttore
    constructor(utenteAutenticato){
        this.utenteAutenticato = utenteAutenticato;
    }
    //Metodi per l'Applicazione
    registrazione(){} //Da implementare

    login(){} //Da implementare

    logout(){} //Da implementare

    verificazioneCredenziali(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Autenticazione',
            utenteAutenticato: this.utenteAutenticato
        }
    }
    static fromJSON(obj){
        return new Autenticazione(obj.utenteAutenticato);
    }
}