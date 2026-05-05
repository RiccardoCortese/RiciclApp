import Utente from './utente.js';

export default class Admin{
    //Costruttore
    constructor(id, nome, email, password,livelloAccesso){
        super(id,nome,email,password);
        this.livelloAccesso = livelloAccesso;
    }
    //Metodi per l'Applicazione
    aggiungiCentro(){} //Da implementare
    rimuoviCentro(){} //Da implementare
    gestisciPremi(){} //Da implementare
    generalReport(){} //Da implementare
    visualizzaSegnalazioni(){} //Da implementare
    aggiornaStatoSegnalazione(){} //Da implementare
    assegnaOperatore(){} //Da implementare
    creaEvento(){} //Da implementare
    //Metodi JSON
    toJSON(){
        const base = super.toJSON();
        return{
            ...base,
            __type: 'Admin',
            livelloAccesso: this.livelloAccesso
        }
    }
    static fromJSON(obj){
        return new Admin(obj.id, obj.nome, obj.email, obj.password, obj.livelloAccesso);
    }

}
