import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    // Wird von der Entity-Automatisierung aufgerufen
    const blowingWorkId = body?.event?.entity_id || body?.blowing_work_id;

    if (!blowingWorkId) {
        return Response.json({ error: 'Keine BlowingWork ID angegeben' }, { status: 400 });
    }

    // BlowingWork laden
    const blowingWork = await base44.asServiceRole.entities.BlowingWork.get(blowingWorkId);

    if (!blowingWork) {
        return Response.json({ error: 'BlowingWork nicht gefunden' }, { status: 404 });
    }

    const { project_id, point_a, point_b, meters_blown, cable_type } = blowingWork;

    if (!project_id || !point_a || !point_b) {
        return Response.json({ error: 'Fehlende Felder: project_id, point_a oder point_b' }, { status: 400 });
    }

    // Hilfsfunktion: Knoten suchen oder erstellen
    async function findOrCreateNode(nodeName) {
        const existingNodes = await base44.asServiceRole.entities.VisioNode.filter({
            project_id,
            node_name: nodeName
        });

        if (existingNodes && existingNodes.length > 0) {
            return existingNodes[0].id;
        }

        // Knotentyp aus dem Namen ableiten
        let node_type = 'Muffe';
        const upperName = nodeName.toUpperCase();
        if (upperName.startsWith('HVT')) node_type = 'HVT';
        else if (upperName.startsWith('KVZ') || upperName.startsWith('KVT')) node_type = 'KVZ';
        else if (upperName.startsWith('NVT')) node_type = 'NVT';
        else if (upperName.startsWith('VZ')) node_type = 'VZ';
        else if (upperName.startsWith('APL')) node_type = 'APL';

        const newNode = await base44.asServiceRole.entities.VisioNode.create({
            project_id,
            node_name: nodeName,
            node_type,
            status: 'DUNKEL',
            position_x: Math.random() * 400 + 100,
            position_y: Math.random() * 400 + 100,
            additional_info: 'Automatisch aus Einblasarbeit erstellt'
        });

        return newNode.id;
    }

    // Beide Knoten finden oder erstellen
    const [fromNodeId, toNodeId] = await Promise.all([
        findOrCreateNode(point_a),
        findOrCreateNode(point_b)
    ]);

    // Prüfen ob diese Verbindung bereits existiert (gleiche Knoten, gleiches Projekt)
    const existingConnections = await base44.asServiceRole.entities.VisioConnection.filter({
        project_id,
        from_node_id: fromNodeId,
        to_node_id: toNodeId
    });

    if (existingConnections && existingConnections.length > 0) {
        return Response.json({
            message: 'Verbindung existiert bereits',
            connection_id: existingConnections[0].id
        });
    }

    // Neue Verbindung erstellen
    const connection = await base44.asServiceRole.entities.VisioConnection.create({
        project_id,
        from_node_id: fromNodeId,
        to_node_id: toNodeId,
        length_meters: meters_blown || 0,
        cable_type: cable_type || '',
        status: 'DUNKEL',
        notes: `Automatisch erstellt aus Einblasarbeit (${point_a} → ${point_b})`
    });

    return Response.json({
        success: true,
        message: `Visioplan-Verbindung ${point_a} → ${point_b} erstellt`,
        connection_id: connection.id,
        from_node_id: fromNodeId,
        to_node_id: toNodeId
    });
});