export default class Utente{
    //Costruttore
    constructor(id, nome, email, password){
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.password = password;
    }
    //Metodi per l'applicazione
    visualizzaMappa(){} //Da implementare

    cercaProdotto(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Utente',
            id: this.id,
            nome: this.nome,
            email: this.email,
            passowrd: this.password
        };
    }

    static fromJSON(obj){
        return new Utente(obj.id, obj.nome, obj.email, obj.password);
    }
}


