import Utente from './utente.js';

export default class OperatoreEcologico{
    //Costruttore
    constructor(id, nome, email, password, matricola, percorsoPersonalizzato){
        super(id,nome,email,password);
        this.matricola = matricola;
        this.percorsoPersonalizzato = percorsoPersonalizzato;
    }

    //Metodi per l'Applicazione
    visualizzaPercorso(){} //Da implementare

    confermaSvuotamento(){} //Da implementare

    segnalaGuasto(){} //Da implementare

    aggiornaStatoSegnalazione(){} //Da implementare

    //Metodi JSON
    toJSON(){
        const base = super.toJSON();
        return{
            ...base,
            __type: 'OperatoreEcologico',
            matricola: this.matricola,
            percorsoPersonalizzato: this.percorsoPersonalizzato
        }
    }

    static formJSON(obj){
        return new OperatoreEcologico(obj.id, obj.nome, obj.email, obj.password, obj.matricola, obj.percorsoPersonalizzato);
    }

}