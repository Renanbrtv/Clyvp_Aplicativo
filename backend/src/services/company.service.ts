import { companyRepository } from '../repositories/company.repository';
import { AppError } from '../utils/app-error';
import type { UpdateCompanyInput } from '../validators/company.validator';
import { toPublicCompany } from './mappers';

export const companyService = {
  async getByUser(userId: number) {
    const company = await companyRepository.findByUserId(userId);
    if (!company) {
      throw AppError.notFound('Perfil da empresa nao encontrado.');
    }
    return toPublicCompany(company);
  },

  async update(userId: number, input: UpdateCompanyInput) {
    const exists = await companyRepository.findByUserId(userId);
    if (!exists) {
      throw AppError.notFound('Perfil da empresa nao encontrado.');
    }

    await companyRepository.update(userId, input);
    return companyService.getByUser(userId);
  },
};
