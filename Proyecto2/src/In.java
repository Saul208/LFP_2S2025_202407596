// Entrada
public class In {
    public static void main(String[] args) {
        // Variables
        int numero = 42;
        double pi = 3.14;
        String mensaje = "Hola Mundo";
        boolean activo = true;
        
        // Operaciones
        int suma = 10 + 20;
        
        // Imprimir
        System.out.println(mensaje);
        System.out.println(suma);
        
        // Condicional
        if (numero > 40) {
            System.out.println("Mayor");
            if (numero == 42) {
                System.out.println("Es la respuesta");
            }
        } else {
            System.out.println("Menor");
        }
        
        // Ciclo for
        for (int i = 0; i < 5; i++) {
            System.out.println(i);
        }
        
        // Ciclo while
        int contador = 0;
        while (contador < 3) {
            System.out.println(contador);
            contador++;
        }
    }
}
