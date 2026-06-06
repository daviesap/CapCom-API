import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import Loading from "../components/Loading.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { getClient, getClients } from "../services/clientService.js";
import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
} from "../services/supplierService.js";

const emptySupplierForm = {
  supplierName: "",
  address: "",
};

export default function SuppliersPage() {
  const {
    userProfile,
    profileLoading,
    isSuperAdmin,
    isClientAdmin,
  } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [deletingSupplierId, setDeletingSupplierId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManageSuppliers = isSuperAdmin || isClientAdmin;
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  useEffect(() => {
    if (profileLoading) return;

    const loadClients = async () => {
      setClientsLoading(true);
      setError("");
      try {
        if (isSuperAdmin) {
          const clientRecords = await getClients();
          setClients(clientRecords);
          setSelectedClientId((current) => current || clientRecords[0]?.id || "");
          return;
        }

        if (userProfile?.clientId) {
          const client = await getClient(userProfile.clientId);
          setClients(client ? [client] : []);
          setSelectedClientId(userProfile.clientId);
          return;
        }

        setClients([]);
        setSelectedClientId("");
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load clients.");
      } finally {
        setClientsLoading(false);
      }
    };

    loadClients();
  }, [profileLoading, isSuperAdmin, userProfile]);

  const loadSuppliers = async (clientId = selectedClientId) => {
    if (!clientId) {
      setSuppliers([]);
      return;
    }

    setSuppliersLoading(true);
    setError("");
    try {
      setSuppliers(await getSuppliers(clientId));
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load suppliers.");
    } finally {
      setSuppliersLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    resetSupplierForm();
    loadSuppliers(selectedClientId);
  }, [profileLoading, selectedClientId]);

  const updateSupplierFormField = (field, value) => {
    setSupplierForm((current) => ({ ...current, [field]: value }));
  };

  const resetSupplierForm = () => {
    setIsSupplierFormOpen(false);
    setEditingSupplierId("");
    setSupplierForm(emptySupplierForm);
  };

  const startAddingSupplier = () => {
    setIsSupplierFormOpen(true);
    setEditingSupplierId("");
    setSupplierForm(emptySupplierForm);
    setError("");
    setMessage("");
  };

  const startEditingSupplier = (supplier) => {
    setIsSupplierFormOpen(true);
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      supplierName: supplier.supplierName || "",
      address: supplier.address || "",
    });
    setError("");
    setMessage("");
  };

  const saveSupplier = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageSuppliers) {
      setError("Your role cannot manage suppliers.");
      return;
    }
    if (!selectedClientId) {
      setError("Choose a client before adding suppliers.");
      return;
    }

    setSavingSupplier(true);
    setError("");
    setMessage("");

    try {
      const supplierName = supplierForm.supplierName.trim();
      const address = supplierForm.address.trim();
      if (!supplierName) {
        setError("Supplier name is required.");
        return;
      }

      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, {
          clientId: selectedClientId,
          supplierName,
          address,
        });
        setMessage("Supplier saved.");
      } else {
        await createSupplier({
          clientId: selectedClientId,
          supplierName,
          address,
        });
        setMessage("Supplier created.");
      }

      resetSupplierForm();
      await loadSuppliers(selectedClientId);
    } catch (supplierError) {
      console.error(supplierError);
      setError("Could not save supplier.");
    } finally {
      setSavingSupplier(false);
    }
  };

  const removeSupplier = async (supplierId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageSuppliers) {
      setError("Your role cannot manage suppliers.");
      return;
    }

    setDeletingSupplierId(supplierId);
    setError("");
    setMessage("");

    try {
      await deleteSupplier(supplierId);
      if (editingSupplierId === supplierId) resetSupplierForm();
      await loadSuppliers(selectedClientId);
      setMessage("Supplier deleted.");
    } catch (supplierError) {
      console.error(supplierError);
      setError("Could not delete supplier.");
    } finally {
      setDeletingSupplierId("");
    }
  };

  if (profileLoading) return <Loading label="Loading suppliers..." />;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Client-wide supplier records.</p>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message success-message">{message}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: supplier records are read-only.</p>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{selectedClient?.clientName || "Suppliers"}</h2>
            <p className="page-subtitle">
              {canManageSuppliers ? "Maintain suppliers for this client." : "View suppliers for your client."}
            </p>
          </div>
          <div className="supplier-toolbar">
            {isSuperAdmin ? (
              <div className="form-row supplier-client-select">
                <label htmlFor="supplierClientId">Client</label>
                <select
                  id="supplierClientId"
                  value={selectedClientId}
                  disabled={clientsLoading}
                  onChange={(event) => setSelectedClientId(event.target.value)}
                >
                  <option value="">Choose a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.clientName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {canManageSuppliers ? (
              <button
                className="button"
                type="button"
                disabled={isOffline || !selectedClientId}
                onClick={startAddingSupplier}
              >
                Add supplier
              </button>
            ) : null}
          </div>
        </div>

        {clientsLoading ? <p className="message">Loading clients...</p> : null}

        {suppliersLoading ? (
          <p className="item-meta">Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <p className="item-meta">No suppliers yet.</p>
        ) : (
          <div className="supplier-list">
            {suppliers.map((supplier) => (
              <div className="supplier-list-row" key={supplier.id}>
                <div>
                  <h3>{supplier.supplierName}</h3>
                  <p className="item-meta supplier-address">
                    {supplier.address || "No address"}
                  </p>
                </div>
                {canManageSuppliers ? (
                  <div className="supplier-list-actions">
                    <button
                      className="compact-button"
                      type="button"
                      disabled={isOffline}
                      onClick={() => startEditingSupplier(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      className="compact-button"
                      type="button"
                      disabled={deletingSupplierId === supplier.id || isOffline}
                      onClick={() => removeSupplier(supplier.id)}
                    >
                      {deletingSupplierId === supplier.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {canManageSuppliers && isSupplierFormOpen ? (
          <form className="supplier-form" onSubmit={saveSupplier}>
            <div className="supplier-form-heading">
              <h3>{editingSupplierId ? "Edit supplier" : "Add supplier"}</h3>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="supplierName">Supplier name</label>
                <input
                  id="supplierName"
                  value={supplierForm.supplierName}
                  disabled={savingSupplier || isOffline || !selectedClientId}
                  onChange={(event) =>
                    updateSupplierFormField("supplierName", event.target.value)
                  }
                  placeholder="Supplier name"
                  required
                />
              </div>
              <div className="form-row full">
                <label htmlFor="supplierAddress">Address</label>
                <textarea
                  id="supplierAddress"
                  value={supplierForm.address}
                  disabled={savingSupplier || isOffline || !selectedClientId}
                  onChange={(event) => updateSupplierFormField("address", event.target.value)}
                  placeholder="Supplier address"
                  rows="4"
                />
              </div>
            </div>
            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={savingSupplier || isOffline || !selectedClientId}
              >
                {savingSupplier
                  ? "Saving..."
                  : editingSupplierId
                    ? "Save supplier"
                    : "Create supplier"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingSupplier || isOffline}
                onClick={resetSupplierForm}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
