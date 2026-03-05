export const buildOKRTree = (data) => {
  if (!data) return [];
  
  const map = {};
  data.forEach(item => {
    map[item['Nombre Tarea']] = { ...item, keyResults: [] };
  });

  const tree = [];
  data.forEach(item => {
    const node = map[item['Nombre Tarea']];
    const padreNombre = item['Objetivo Padre'];
    
    // CAMBIO CLAVE: 
    // Si tiene padre PERO el padre no existe en el mapa de este usuario,
    // lo tratamos como un nodo raíz (para que aparezca en su tarjeta).
    if (padreNombre && map[padreNombre]) {
      map[padreNombre].keyResults.push(node);
    } else {
      tree.push(node);
    }
  });

  return tree;
};