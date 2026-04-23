<?php
header('Content-Type: application/json');

// Configuração do Banco de Dados
$host = 'localhost';
$dbname = 'familyhub';
$user = 'root'; // Altere se necessário
$pass = ''; // Altere se necessário

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['erro' => 'Erro de conexão: ' . $e->getMessage()]));
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_membros':
        $stmt = $pdo->query("SELECT * FROM Membros");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'get_atividades':
        $id_membro = $_GET['id_membro'] ?? null;
        if ($id_membro) {
            $stmt = $pdo->prepare("SELECT * FROM Atividades WHERE id_membro = ? ORDER BY data ASC");
            $stmt->execute([$id_membro]);
        } else {
            $stmt = $pdo->query("SELECT * FROM Atividades ORDER BY data ASC");
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'add_atividade':
        $data = json_decode(file_get_contents('php://input'), true);
        if(empty($data['id_membro']) || empty($data['descricao'])) {
            echo json_encode(['sucesso' => false, 'erro' => 'Dados obrigatórios ausentes']);
            exit;
        }
        $stmt = $pdo->prepare("INSERT INTO Atividades (descricao, tipo, data, prioridade, id_membro) VALUES (?, ?, ?, ?, ?)");
        $sucesso = $stmt->execute([
            $data['descricao'], 
            $data['tipo'], 
            $data['data'], 
            $data['prioridade'], 
            $data['id_membro']
        ]);
        echo json_encode(['sucesso' => $sucesso]);
        break;
        
    case 'concluir_atividade':
        $data = json_decode(file_get_contents('php://input'), true);
        $id_atividade = $data['id_atividade'];
        $id_membro = $data['id_membro'];
        
        // Atualiza status e adiciona pontos (Gamificação)
        $pdo->prepare("UPDATE Atividades SET status = 'concluida' WHERE id_atividade = ?")->execute([$id_atividade]);
        $pdo->prepare("UPDATE Membros SET pontos = pontos + 10 WHERE id_membro = ?")->execute([$id_membro]);
        
        echo json_encode(['sucesso' => true]);
        break;

    default:
        echo json_encode(['erro' => 'Ação inválida']);
}
?>