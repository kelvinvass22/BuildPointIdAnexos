import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("obras", "0003_remove_obra_gerente_vinculogerente_obra_gerentes_and_more"),
        ("usuarios", "0003_perfis_vinculos"),
    ]

    operations = [
        migrations.CreateModel(
            name="Equipe",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("nome", models.CharField(max_length=100)),
                ("ativa", models.BooleanField(default=True)),
                ("criada_em", models.DateTimeField(auto_now_add=True)),
                ("gerente", models.ForeignKey(
                    limit_choices_to={"papel": "GERENTE"},
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="equipes_lideradas",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("obra", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="equipes",
                    to="obras.obra",
                )),
                ("membros", models.ManyToManyField(
                    blank=True,
                    related_name="equipes",
                    to="usuarios.perfiloperario",
                )),
            ],
            options={
                "db_table": "equipes",
                "ordering": ["nome"],
            },
        ),
        migrations.AddConstraint(
            model_name="equipe",
            constraint=models.UniqueConstraint(fields=("obra", "nome"), name="equipe_nome_unico_por_obra"),
        ),
    ]
