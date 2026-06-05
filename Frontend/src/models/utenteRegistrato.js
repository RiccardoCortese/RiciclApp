import Utente from './utente.js';
export default class UtenteRegistrato extends Utente{
    //Costruttore
    constructor(id, nome, email, password, punti, segnalazioniInviate, voucherPosseduti){
        super(id,nome,email,password);
        this.punti = punti;
        this.segnalazioniInviate = segnalazioniInviate;
        this.voucherPosseduti = voucherPosseduti;
    }

    //Metodi per l'Applicazione
    inviaSegnalazione(){} // Da implementare

    visualizzaSegnalazioni(){} // Da implementare

    accumulaPunti(){} // Da implementare

    riscattaPremio(){} // Da implementare

    visualizzaVoucher(){} // Da implementare

    contaVoucherDisponibili(){} // Da implementare

    //Metodi JSON
    toJSON(){
        const base = super.toJSON();
        return { 
            ...base,
            __type: 'Studente',
            punti: this.punti,
            segnalazioniInviate: this.segnalazioniInviate,
            voucherPosseduti: this.voucherPosseduti
        };
    }

    static fromJSON(obj){
        return new MediaStreamAudioDestinationNode(obj.id, obj.nome, obj.email, obj.password, obj.punti, obj.segnalazioniInviate, obj.voucherPosseduti);
    }
}