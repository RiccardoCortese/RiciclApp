export default class Premio{
    //Constructor
    constructor(idPremio, nome, descrizione, costoPunti, disponibilita){
        this.idPremio = idPremio,
        this.nome = nome,
        this.descrizione = descrizione,
        this.costoPunti = costoPunti,
        this.disponibilita = disponibilita
    }
    //Metodi dell'Applicazione
    verificaDispobilita(){} //Da implementare
    generaVoucher(){} //Da implementare
    
    //Metodi JSON
    toJSON(){
        return{
            __type: 'Premio',
            idPremio: this.idPremio,
            nome: this.nome,
            descrizione: this.descrizione,
            costoPunti: this.costoPunti,
            dispoibilita: this.disponibilita
        }
    }
    fromJSON(obj){
        return new Premio(obj.idPremio, obj.nome, obj.descrizione, obj.costoPunti, obj.dispoibilita);
    }
}