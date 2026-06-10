import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "../services/companyService.js";
import { getCachedCompanies } from "../services/localScheduleCache.js";

const emptyCompanyForm = {
  companyName: "",
  address: "",
};

export default function CompaniesPage() {
  const {
    profileLoading,
    isSuperAdmin,
    isAdmin,
    activeClientId,
    activeClient,
    activeClientLoading,
  } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [companies, setCompanies] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [deletingCompanyId, setDeletingCompanyId] = useState("");
  const [companyMessage, setCompanyMessage] = useState("");
  const [companyError, setCompanyError] = useState("");
  const canManageCompanies = isSuperAdmin || isAdmin;
  const isDeletingCurrentCompany = Boolean(editingCompanyId && deletingCompanyId === editingCompanyId);

  const loadCompanies = async (clientId = activeClientId) => {
    if (!clientId) {
      setCompanies([]);
      return;
    }

    const cachedCompanies = getCachedCompanies(clientId);
    if (cachedCompanies.length > 0) {
      setCompanies(cachedCompanies);
    }

    setCompanyError("");
    try {
      setCompanies(await getCompanies(clientId));
    } catch (loadError) {
      console.error(loadError);
      setCompanyError("Could not load companies.");
    }
  };

  useEffect(() => {
    if (profileLoading || activeClientLoading) return;
    resetCompanyForm();
    loadCompanies(activeClientId);
  }, [profileLoading, activeClientLoading, activeClientId]);

  const updateCompanyFormField = (field, value) => {
    setCompanyForm((current) => ({ ...current, [field]: value }));
  };

  const resetCompanyForm = () => {
    setIsCompanyFormOpen(false);
    setEditingCompanyId("");
    setCompanyForm(emptyCompanyForm);
  };

  const startAddingCompany = () => {
    setCompanyMessage("");
    setCompanyError("");
    setIsCompanyFormOpen(true);
    setEditingCompanyId("");
    setCompanyForm(emptyCompanyForm);
  };

  const startEditingCompany = (company) => {
    setCompanyMessage("");
    setCompanyError("");
    setIsCompanyFormOpen(true);
    setEditingCompanyId(company.id);
    setCompanyForm({
      companyName: company.companyName || "",
      address: company.address || "",
    });
  };

  const saveCompany = async (submitEvent) => {
    submitEvent.preventDefault();
    setCompanyMessage("");
    setCompanyError("");
    if (isOffline) {
      setCompanyError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanies) {
      setCompanyError("Your role cannot manage companies.");
      return;
    }
    if (!activeClientId) {
      setCompanyError("Choose a client on the Profile page before adding companies.");
      return;
    }

    setSavingCompany(true);

    try {
      const companyName = companyForm.companyName.trim();
      const address = companyForm.address.trim();
      if (!companyName) {
        setCompanyError("Company name is required.");
        return;
      }

      if (editingCompanyId) {
        await updateCompany(editingCompanyId, {
          clientId: activeClientId,
          companyName,
          address,
        });
        setCompanyMessage("Company saved.");
      } else {
        await createCompany({
          clientId: activeClientId,
          companyName,
          address,
        });
        setCompanyMessage("Company created.");
      }

      resetCompanyForm();
      await loadCompanies(activeClientId);
    } catch (companyError) {
      console.error(companyError);
      setCompanyError("Could not save company.");
    } finally {
      setSavingCompany(false);
    }
  };

  const removeCompany = async (companyId) => {
    if (isOffline) {
      setCompanyError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanies) {
      setCompanyError("Your role cannot manage companies.");
      return;
    }

    setCompanyMessage("");
    setCompanyError("");
    setDeletingCompanyId(companyId);

    try {
      await deleteCompany(companyId);
      if (editingCompanyId === companyId) resetCompanyForm();
      await loadCompanies(activeClientId);
      setCompanyMessage("Company deleted.");
    } catch (companyError) {
      console.error(companyError);
      setCompanyError("Could not delete company.");
    } finally {
      setDeletingCompanyId("");
    }
  };

  if (profileLoading) {
    return <Loading />;
  }

  return (
    <main className="page">
      {isOffline ? (
        <p className="message offline-message">Offline mode: company records are read-only.</p>
      ) : null}
      {companyError ? <p className="error">{companyError}</p> : null}
      {companyMessage ? <p className="message">{companyMessage}</p> : null}

      <div className="company-toolbar">
        {canManageCompanies ? (
          <button
            className="button"
            type="button"
            aria-label="Add company"
            disabled={isOffline || activeClientLoading || !activeClientId}
            onClick={startAddingCompany}
          >
            <CapcomIcon name="add" size={18} weight="bold" />
            <span className="button-label">Add company</span>
          </button>
        ) : null}
      </div>

      {companies.length === 0 ? (
        <p className="item-meta">No companies yet.</p>
      ) : (
        <div className="company-list">
          {companies.map((company) => (
            canManageCompanies ? (
              <button
                className="list-item company-card-button"
                key={company.id}
                type="button"
                aria-label={`Edit ${company.companyName}`}
                disabled={isOffline}
                onClick={() => startEditingCompany(company)}
              >
                <span className="company-card-main">
                  <span className="company-card-copy">
                    <span className="item-title">{company.companyName}</span>
                    {company.address ? (
                      <span className="item-meta company-address">{company.address}</span>
                    ) : null}
                  </span>
                </span>
                <span className="company-card-chevron" aria-hidden="true">
                  <CapcomIcon name="caretRight" size={22} weight="bold" />
                </span>
              </button>
            ) : (
              <article className="list-item company-card-static" key={company.id}>
                <div className="company-card-main">
                  <div className="company-card-copy">
                    <p className="item-title">{company.companyName}</p>
                    {company.address ? (
                      <p className="item-meta company-address">{company.address}</p>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          ))}
        </div>
      )}

      {canManageCompanies && isCompanyFormOpen ? (
        <Modal
          title={editingCompanyId ? "Edit company" : "Add company"}
          subtitle={activeClient?.clientName || "Company record"}
          labelledBy="companyFormTitle"
          closeLabel="Close company form"
          onClose={resetCompanyForm}
        >
          {companyError ? <p className="error">{companyError}</p> : null}
          {companyMessage ? <p className="message">{companyMessage}</p> : null}
          <form className="company-form" onSubmit={saveCompany}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="companyName">Company name</label>
                <input
                  id="companyName"
                  value={companyForm.companyName}
                  disabled={savingCompany || isOffline || !activeClientId}
                  onChange={(event) =>
                    updateCompanyFormField("companyName", event.target.value)
                  }
                  placeholder="Company name"
                  required
                />
              </div>
              <div className="form-row full">
                <label htmlFor="companyAddress">Address</label>
                <textarea
                  id="companyAddress"
                  value={companyForm.address}
                  disabled={savingCompany || isOffline || !activeClientId}
                  onChange={(event) => updateCompanyFormField("address", event.target.value)}
                  placeholder="Company address"
                  rows="4"
                />
              </div>
            </div>
            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={savingCompany || isDeletingCurrentCompany || isOffline || !activeClientId}
              >
                {savingCompany
                  ? "Saving..."
                  : editingCompanyId
                    ? "Save"
                    : "Create company"}
              </button>
              {editingCompanyId ? (
                <button
                  className="button danger"
                  type="button"
                  disabled={savingCompany || isDeletingCurrentCompany || isOffline}
                  onClick={() => removeCompany(editingCompanyId)}
                >
                  <CapcomIcon name="delete" size={18} weight="bold" />
                  <span className="button-label">
                    {isDeletingCurrentCompany ? "Deleting..." : "Delete"}
                  </span>
                </button>
              ) : null}
              <button
                className="button secondary"
                type="button"
                disabled={savingCompany || isDeletingCurrentCompany || isOffline}
                onClick={resetCompanyForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </main>
  );
}
