import { useState } from 'react';
import { auth, googleProvider, db } from '../config/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// IMPORTAMOS LOS ICONOS PROFESIONALES
// Necesitas ejecutar: npm install lucide-react
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const checkAndCreateUser = async (user) => {
    try {
      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          nombre: user.displayName || "Usuario Nuevo",
          rol: "colaborador",
          numeroEmpleado: "",
          fechaCreacion: new Date().toISOString()
        });
      }
      onLoginSuccess(user);
    } catch (err) {
      setError("Error al validar tu perfil de usuario.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await checkAndCreateUser(result.user);
    } catch (err) {
      setError("Error al conectar con Google.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await checkAndCreateUser(result.user);
    } catch (err) {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  // --- ESTILOS INLINE ---
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc', 
      padding: '20px',
      boxSizing: 'border-box'
    },
    card: {
      backgroundColor: '#ffffff',
      padding: '50px 40px',
      borderRadius: '20px',
      // Sombra sutil pero moderna
      boxShadow: '0 15px 35px rgba(1, 1, 60, 0.08)',
      width: '100%',
      maxWidth: '420px',
      textAlign: 'center',
      boxSizing: 'border-box'
    },
    logoContainer: {
      display: 'block',
      margin: '0 auto 15px auto',
      textAlign: 'center',
      justifyContent: 'center',
      alignItems: 'center'
    },
    logo: {
      width: '130px',
      height: 'auto',
      margin: 'auto'
    },
    systemTitle: {
      color: '#94a3b8', // Color sutil
      fontSize: '14px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      margin: '0 0 8px 0',
    },
    welcomeText: {
      color: '#01013c', // COLOR CORPORATIVO
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '35px',
      marginTop: '0'
    },
    inputGroup: {
      marginBottom: '20px',
      textAlign: 'left',
      position: 'relative', // Importante para posicionar los iconos
    },
    inputWithIcon: {
        width: '100%',
        padding: '14px 18px', // Más padding interno
        // Padding extra a la derecha para que el texto no toque el icono
        paddingRight: '45px', 
        borderRadius: '8px', // Bordes más rectos, como en tu foto
        border: '1px solid #d1d5db', // Color de borde gris suave
        fontSize: '16px',
        color: '#1f2937',
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    // Estilo para el icono derecho fijo (como el de usuario)
    rightIcon: {
        position: 'absolute',
        right: '15px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#9ca3af', // Gris suave del icono en tu foto
        pointerEvents: 'none', // El icono no bloquea los clics en el input
    },
    // Contenedor para el password que incluye el input y el botón
    passwordFieldWrapper: {
        position: 'relative',
        width: '100%',
    },
    // Estilo para el botón de ojito (que es un icono interactivo a la derecha)
    eyeButton: {
      position: 'absolute',
      right: '8px', // Posicionado a la derecha
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'none', // Sin fondo
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      color: '#01013c', // Color corporativo para que resalte
      transition: 'color 0.2s',
      zIndex: '10', // Por encima del input
    },
    mainButton: {
      width: '100%',
      padding: '16px',
      backgroundColor: '#01013c', // COLOR CORPORATIVO
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px',
      textTransform: 'uppercase', // Estilo más de aplicación
      letterSpacing: '0.5px',
      boxShadow: '0 4px 10px rgba(1, 1, 60, 0.2)',
      transition: 'opacity 0.2s',
    },
    googleButton: {
      width: '100%',
      padding: '14px',
      background: 'white',
      color: '#334155',
      border: '1.5px solid #e2e8f0',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '500',
      marginTop: '25px',
      transition: 'background 0.2s'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* LOGO CENTRADO */}
        <div style={styles.logoContainer}>
            <img 
            src="/imagotipo.png" // Ruta de tu imagen
            alt="Logo Empresa" 
            style={styles.logo} 
            />
        </div>
        
        <p style={styles.systemTitle}>Sistema de Delegación de Objetivos</p>
        <h2 style={styles.welcomeText}>Bienvenido</h2>

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            {/* CAMPO DE USUARIO (EMAIL) */}
            <input 
              type="email" 
              placeholder="Correo" // Placeholder exacto de tu foto
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              // Aplicamos estilos base de input con icono
              style={styles.inputWithIcon}
              required
            />
            {/* ICONO DE USUARIO A LA DERECHA (FIJO) */}
            <User style={styles.rightIcon} size={22} strokeWidth={1.5}/>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.passwordFieldWrapper}>
                {/* CAMPO DE CONTRASEÑA */}
                <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Contraseña" // Placeholder exacto de tu foto
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                // Aplicamos estilos base de input con icono
                style={styles.inputWithIcon}
                required
                />
                
                {/* BOTÓN DEL OJITO (INTERACTIVO A LA DERECHA) */}
                <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={styles.eyeButton}
                title={showPassword ? "Ocultar" : "Mostrar"}
                >
                {/* Alternamos el icono del ojito abierto/cerrado */}
                {showPassword ? (
                    <Eye size={20} strokeWidth={1.8}/>
                ) : (
                    <EyeOff size={20} strokeWidth={1.8}/>
                )}
                </button>
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '15px' }}>{error}</p>}

          <button type="submit" style={styles.mainButton}>
            Iniciar Sesión
          </button>
        </form>

        <div style={{ margin: '30px 0', position: 'relative' }}>
          <hr style={{ border: '0', borderTop: '1px solid #e2e8f0' }} />
          <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '0 15px', color: '#cbd5e1', fontSize: '12px', fontWeight: '500' }}>
            O
          </span>
        </div>

        <button onClick={handleGoogleLogin} style={styles.googleButton}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="G" />
          Continuar con Google
        </button>
      </div>
    </div>
  );
};

export default Login;